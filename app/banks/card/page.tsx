"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import MonthRows from "@/components/transaction-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeftIcon, ChevronDownIcon, ChevronRightIcon, CreditCardIcon, SaveIcon, Trash2Icon, Wand, LoaderCircle } from "lucide-react"
import ImportDropdown from "@/components/import-dropdown"
import { AddTransactionSheet } from "../components/add-transaction-sheet"
import type { Account, CreditCard, Transaction } from "@/app/types/electron"
import { Suspense } from "react"
import { EditCreditCardSheet } from "../components/edit-credit-card-sheet"

const CATEGORIES = [
    "Alimentação", "Transporte", "Moradia", "Saúde", "Educação",
    "Lazer", "Vestuário", "Salário", "Investimento", "Transferência", "Boleto", "Outros",
]

import { buildSummaries, MonthSummary } from "@/lib/transactions"


function fmt(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

// ── Page ─────────────────────────────────────────────────────────

function CardDetailPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const cardId = parseInt(searchParams.get("id") ?? "0", 10)

    const [card, setCard] = React.useState<CreditCard | null>(null)
    const [linkedAccount, setLinkedAccount] = React.useState<Account | null>(null)
    const [summaries, setSummaries] = React.useState<MonthSummary[]>([])
    const [drafts, setDrafts] = React.useState<Record<number, Transaction>>({})
    const [loading, setLoading] = React.useState(true)
    const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
    const [deletingMonth, setDeletingMonth] = React.useState<string | null>(null)
    const [autoCategorizing, setAutoCategorizing] = React.useState<string | null>(null)
    const [editOpen, setEditOpen] = React.useState(false)
    const [addOpen, setAddOpen] = React.useState(false)

    function handleDraftChange<K extends keyof Transaction>(id: number, field: K, value: Transaction[K]) {
        setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
    }

    function onBatchDrafts(drafts: Record<number, Transaction>, updates: Transaction[], field: string, update: (string | null)[]) {
        const novosDrafts = { ...drafts }
        updates.forEach((t, i) => {
            if (t.id != null && update[i]) {
                novosDrafts[t.id] = { ...novosDrafts[t.id], [field]: update[i] }
            }
        })
        return novosDrafts
    }

    async function load() {
        if (!cardId) return
        setLoading(true)
        try {
            const [cards, accounts, transactions] = await Promise.all([
                window.electronAPI?.db.creditCards.list() ?? [],
                window.electronAPI?.db.accounts.list() ?? [],
                window.electronAPI?.db.transactions.list({ creditCardId: cardId }) ?? [],
            ])
            const found = (cards ?? []).find(c => c.id === cardId) ?? null
            setCard(found)
            if (found) {
                const acc = (accounts ?? []).find(a => a.id === found.account_id) ?? null
                setLinkedAccount(acc)
            }
            const txns = transactions ?? []
            setSummaries(buildSummaries(txns))
            setDrafts(Object.fromEntries(txns.filter(t => t.id != null).map(t => [t.id!, { ...t }])))
        } catch {
            // outside electron
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => { load() }, [cardId])

    async function handleMonthRowsSaved(updatedIds?: number[], deletedId?: number) {
        if (!cardId) return
        try {
            // Rebuild current transactions from local summaries, apply local drafts for updated ids
            const currentTxns: Transaction[] = summaries.flatMap(s => s.transactions).map(t => ({ ...t }))

            let nextTxns = currentTxns

            if (updatedIds && updatedIds.length > 0) {
                nextTxns = nextTxns.map(t => {
                    if (t.id != null && updatedIds.includes(t.id)) {
                        const d = drafts[t.id]
                        return d ? { ...d } : t
                    }
                    return t
                })

                setDrafts(prev => {
                    const next = { ...prev }
                    updatedIds.forEach(id => {
                        const d = drafts[id]
                        if (d) next[id] = { ...d }
                        else delete next[id]
                    })
                    return next
                })
            }

            if (deletedId != null) {
                nextTxns = nextTxns.filter(t => t.id !== deletedId)
                setDrafts(prev => {
                    const next = { ...prev }
                    delete next[deletedId]
                    return next
                })
            }

            setSummaries(buildSummaries(nextTxns))
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao atualizar localmente")
        }
    }

    function toggleExpand(monthYear: string) {
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(monthYear)) next.delete(monthYear)
            else next.add(monthYear)
            return next
        })
    }

    async function autoCategories(monthYear: string) {
        const transactions = summaries.find(s => s.monthYear === monthYear)?.transactions ?? []
        const uncategorized = transactions.filter(t => !t.category && t.id != null)

        if (uncategorized.length === 0) {
            toast.info("Todas as transações desta fatura já possuem categoria", { position: "top-center" })
            return
        }

        setAutoCategorizing(monthYear)
        try {
            const categories = await window.electronAPI?.ai.categorize(uncategorized)
            if (categories) {
                setDrafts(prev => onBatchDrafts(prev, uncategorized, "category", categories))
                toast.success(`${uncategorized.length} transação(ões) categorizadas`, { position: "top-center" })
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao categorizar")
        } finally {
            setAutoCategorizing(null)
        }
    }

    async function handleDeleteMonth(monthYear: string, label: string) {
        if (!cardId) return
        setDeletingMonth(monthYear)
        try {
            await window.electronAPI?.db.creditCards.deleteByMonth(cardId, monthYear)
            toast.success(`Transações de ${label} excluídas`, { position: "top-center" })
            setExpanded((prev) => { const n = new Set(prev); n.delete(monthYear); return n })
            await load()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao excluir transações")
        } finally {
            setDeletingMonth(null)
        }
    }

    const totalExpense = summaries.reduce((s, r) => s + r.expense, 0)
    const totalNet = summaries.reduce((s, r) => s + r.total, 0)
    const totalCount = summaries.reduce((s, r) => s + r.count, 0)

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeftIcon className="size-4" />
                </Button>
                {card && (
                    <div className="flex items-center gap-2 flex-1">
                        <CreditCardIcon className="size-5 shrink-0" style={{ color: card.color ?? "#6366f1" }} />
                        <div className="flex-1">
                            <h1 className="text-lg font-semibold leading-none">{card.name}</h1>
                            {linkedAccount && (
                                <p className="text-sm text-muted-foreground">
                                    {linkedAccount.name}{linkedAccount.bank ? ` — ${linkedAccount.bank}` : ""}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                                Editar
                            </Button>
                            <ImportDropdown defaultCreditCardId={card.id} onSuccess={load} />
                        </div>
                    </div>
                )}
            </div>

            {/* Card info */}
            {!loading && card && (
                <Card>
                    <AddTransactionSheet open={addOpen} onOpenChange={setAddOpen} onSuccess={load} creditCardId={card?.id ?? null} />
                    <CardContent className="pt-4">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Limite</p>
                                <p className="text-lg font-semibold">
                                    {card.credit_limit
                                        ? card.credit_limit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                                        : "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Dia de fechamento</p>
                                <p className="text-lg font-semibold">{card.closing_day ?? "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Dia de vencimento</p>
                                <p className="text-lg font-semibold">{card.due_day ?? "—"}</p>
                            </div>
                            {linkedAccount && (
                                <div className="sm:col-span-3 pt-1 border-t">
                                    <p className="text-xs text-muted-foreground mb-0.5">Conta bancária vinculada</p>
                                    <button
                                        type="button"
                                        onClick={() => router.push(`/banks/account?id=${linkedAccount.id}`)}
                                        className="flex items-center gap-1.5 text-sm font-medium hover:underline"
                                    >
                                        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: linkedAccount.color ?? "#6366f1" }} />
                                        {linkedAccount.name}
                                        {linkedAccount.bank && <span className="text-muted-foreground font-normal">— {linkedAccount.bank}</span>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary cards */}
            {!loading && summaries.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <Card>
                        <CardHeader className="pb-1">
                            <CardDescription>Total de transações</CardDescription>
                            <CardTitle className="text-2xl">{totalCount}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-1">
                            <CardDescription>Total saídas</CardDescription>
                            <CardTitle className="text-2xl text-red-600 dark:text-red-400">{fmt(totalExpense)}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            )}

            {/* Tree table */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between w-full">
                        <div>
                            <CardTitle>Faturas</CardTitle>
                            <CardDescription>Clique em uma fatura para expandir e editar as transações.</CardDescription>
                        </div>
                        <div className="flex items-center">
                            <Button size="sm" className="cursor-pointer" variant="secondary" onClick={() => setAddOpen(true)}>Adicionar</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
                    ) : summaries.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            Nenhuma transação importada para este cartão.
                        </p>
                    ) : (
                        <div className="rounded-md border overflow-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="px-4 py-2.5 text-left font-medium w-[180px]">Mês da fatura</th>
                                        <th className="px-4 py-2.5 text-right font-medium w-16">Qtd.</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Saídas</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Total</th>
                                        <th className="px-4 py-2.5 w-20" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaries.map((s) => {
                                        const isOpen = expanded.has(s.monthYear)
                                        return (
                                            <React.Fragment key={s.monthYear}>
                                                {/* Fatura summary row */}
                                                <tr
                                                    className="border-b hover:bg-muted/30 cursor-pointer select-none"
                                                    onClick={() => toggleExpand(s.monthYear)}
                                                >
                                                    <td className="px-4 py-2.5 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {isOpen
                                                                ? <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
                                                                : <ChevronRightIcon className="size-4 text-muted-foreground shrink-0" />
                                                            }
                                                            {s.label}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right text-muted-foreground">{s.count}</td>
                                                    <td className="px-4 py-2.5 text-right text-red-600 dark:text-red-400">{fmt(s.expense)}</td>
                                                    <td className={`px-4 py-2.5 text-right font-semibold ${s.total >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                                        {fmt(s.total)}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 text-muted-foreground hover:text-destructive"
                                                            disabled={deletingMonth === s.monthYear}
                                                            onClick={() => handleDeleteMonth(s.monthYear, s.label)}
                                                        >
                                                            <Trash2Icon className="size-3.5" />
                                                            <span className="sr-only">Excluir {s.label}</span>
                                                        </Button>
                                                    </td>
                                                </tr>

                                                {/* Expanded transaction rows */}
                                                {isOpen && (
                                                    <tr className="border-b bg-muted/10">
                                                        <td colSpan={6} className="p-0">
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="border-b bg-muted/40">
                                                                        <th className="pl-10 pr-2 py-1.5 text-left font-medium text-muted-foreground w-[120px]">Data</th>
                                                                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Descrição</th>
                                                                        <th className="px-2 py-1.5 text-right font-medium text-muted-foreground w-[110px]">Valor</th>
                                                                        <th className="px-2 py-1.5 text-center font-medium text-muted-foreground w-[90px]">Tipo</th>
                                                                        <th className="px-2 gap-2 inline-flex items-center py-1.5 text-left font-medium text-muted-foreground w-[140px]">Categoria
                                                                            <button
                                                                                type="button"
                                                                                title="Auto categorizar usando IA"
                                                                                onClick={() => autoCategories(s.monthYear)}
                                                                                disabled={autoCategorizing === s.monthYear}
                                                                                className="rounded cursor-pointer p-1 gap-2 text-muted-foreground hover:bg-green-500/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                                                            >
                                                                                {autoCategorizing === s.monthYear
                                                                                    ? <LoaderCircle className="size-4 animate-spin" />
                                                                                    : <Wand className="size-4" />}
                                                                            </button>


                                                                        </th>
                                                                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-[100px]">Mês da fatura</th>
                                                                        <th className="px-2 py-1.5 w-16" />
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <MonthRows
                                                                        transactions={s.transactions}
                                                                        drafts={drafts}
                                                                        onDraftChange={handleDraftChange}
                                                                        onSaved={handleMonthRowsSaved}
                                                                        categories={CATEGORIES}
                                                                    />
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        )
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t bg-muted/50 font-semibold">
                                        <td className="px-4 py-2.5">Total geral</td>
                                        <td className="px-4 py-2.5 text-right text-muted-foreground">{totalCount}</td>
                                        <td className="px-4 py-2.5 text-right text-red-600 dark:text-red-400">{fmt(totalExpense)}</td>
                                        <td className={`px-4 py-2.5 text-right font-bold ${totalNet >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                            {fmt(totalNet)}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <EditCreditCardSheet
                card={card}
                open={editOpen}
                onOpenChange={setEditOpen}
                onSuccess={load}
            />
        </div>
    )
}

export default function CardDetailPageWrapper() {
    return (
        <Suspense>
            <CardDetailPage />
        </Suspense>
    )
}
