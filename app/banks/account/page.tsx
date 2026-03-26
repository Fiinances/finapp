"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import MonthRows from "@/components/transaction-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeftIcon, ChevronDownIcon, ChevronRightIcon, SaveIcon, Trash2Icon, CreditCardIcon, Wand, LoaderCircle } from "lucide-react"
import ImportDropdown from "@/components/import-dropdown"
import { AddTransactionSheet } from "../components/add-transaction-sheet"
import { MonthlyIncomeExpenseChart } from "@/app/dashboard/components/MonthlyIncomeExpenseChart"
import { CategoryExpenseChart } from "@/app/dashboard/components/CategoryExpenseChart"
import { CreditCardFaturaChart } from "@/app/dashboard/components/CreditCardFaturaChart"
import { AccountSubscriptionsCalendar } from "@/app/dashboard/components/AccountSubscriptionsCalendar"
import { Suspense } from "react"
import type { Account, Transaction, CreditCard } from "@/app/types/electron"

const CATEGORIES = [
    "Alimentação", "Transporte", "Moradia", "Saúde", "Educação",
    "Lazer", "Vestuário", "Salário", "Investimento", "Transferência", "Boleto", "Outros",
]

import { buildSummaries, txBillingMonth, MonthSummary } from "@/lib/transactions"


function fmt(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}


// ── Page ─────────────────────────────────────────────────────────

function AccountDetailPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const accountId = parseInt(searchParams.get("id") ?? "0", 10)

    const [account, setAccount] = React.useState<Account | null>(null)
    const [summaries, setSummaries] = React.useState<MonthSummary[]>([])
    const [drafts, setDrafts] = React.useState<Record<number, Transaction>>({})
    const [loading, setLoading] = React.useState(true)
    const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
    const [deletingMonth, setDeletingMonth] = React.useState<string | null>(null)
    const [autoCategorizing, setAutoCategorizing] = React.useState<string | null>(null)
    const [linkedCards, setLinkedCards] = React.useState<CreditCard[]>([])
    const [cardSpend, setCardSpend] = React.useState<Record<number, number>>({})
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
        if (!accountId) return
        setLoading(true)
        try {
            const [accounts, accountTxns, allCards] = await Promise.all([
                window.electronAPI?.db.accounts.list() ?? [],
                window.electronAPI?.db.transactions.list({ accountId }) ?? [],
                window.electronAPI?.db.creditCards.list() ?? [],
            ])
            const found = (accounts ?? []).find((a) => a.id === accountId) ?? null
            setAccount(found)
            const txns = accountTxns ?? []
            setSummaries(buildSummaries(txns))
            setDrafts(Object.fromEntries(txns.filter(t => t.id != null).map(t => [t.id!, { ...t }])))

            const linked = (allCards ?? []).filter((c) => c.account_id === accountId)
            setLinkedCards(linked)

            if (linked.length > 0) {
                const cardTxnsArrays = await Promise.all(
                    linked.map((c) =>
                        window.electronAPI?.db.transactions.list({ creditCardId: c.id! }) ?? Promise.resolve([])
                    )
                )
                const now = new Date()
                const currentBm = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`
                const spendMap: Record<number, number> = {}
                for (let i = 0; i < linked.length; i++) {
                    spendMap[linked[i].id!] = (cardTxnsArrays[i] ?? [])
                        .filter((t) => t.type === "expense" && txBillingMonth(t) === currentBm)
                        .reduce((s, t) => s + t.amount, 0)
                }
                setCardSpend(spendMap)
            }
        } catch {
            // outside electron
        } finally {
            setLoading(false)
        }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(() => { load() }, [accountId])

    async function handleMonthRowsSaved(updatedIds?: number[], deletedId?: number) {
        if (!accountId) return
        try {
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
            toast.info("Todas as transações deste mês já possuem categoria", { position: "top-center" })
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
        if (!accountId) return
        setDeletingMonth(monthYear)
        try {
            await window.electronAPI?.db.transactions.deleteByMonth(accountId, monthYear)
            toast.success(`Transações de ${label} excluídas`, { position: "top-center" })
            setExpanded((prev) => { const n = new Set(prev); n.delete(monthYear); return n })
            await load()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao excluir transações")
        } finally {
            setDeletingMonth(null)
        }
    }

    const totalIncome = summaries.reduce((s, r) => s + r.income, 0)
    const totalExpense = summaries.reduce((s, r) => s + r.expense, 0)
    const totalInvestment = summaries.reduce((s, r) => s + r.investment, 0)
    const totalCount = summaries.reduce((s, r) => s + r.count, 0)

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="secondary" className="cursor-pointer" size="icon" onClick={() => router.back()}>
                    <ArrowLeftIcon className="size-4" />
                </Button>
                {account && (
                    <div className="flex items-center gap-2 flex-1">
                        <span className="size-4 rounded-full shrink-0" style={{ backgroundColor: account.color ?? "#6366f1" }} />
                        <div className="flex-1">
                            <h1 className="text-lg font-semibold leading-none">{account.name}</h1>
                            {account.bank && <p className="text-sm text-muted-foreground">{account.bank}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                            <ImportDropdown defaultAccountId={account.id} onSuccess={load} />
                        </div>
                    </div>
                )}
            </div>

            {/* Summary cards */}
            {!loading && summaries.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-1">
                            <CardDescription>Total de transações</CardDescription>
                            <CardTitle className="text-2xl">{totalCount}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-1">
                            <CardDescription>Total entradas</CardDescription>
                            <CardTitle className="text-2xl text-green-600 dark:text-green-400">{fmt(totalIncome)}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-1">
                            <CardDescription>Total saídas</CardDescription>
                            <CardTitle className="text-2xl text-red-600 dark:text-red-400">{fmt(totalExpense)}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-1">
                            <CardDescription>Total investimentos</CardDescription>
                            <CardTitle className="text-2xl text-amber-600 dark:text-amber-400">{fmt(totalInvestment)}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            )}

            {/* Linked credit cards */}
            {!loading && linkedCards.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <CreditCardIcon className="size-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold">Cartões vinculados</h2>
                        <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                            {linkedCards.length}
                        </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {linkedCards.map((card) => {
                            const color = card.color ?? "#6366f1"
                            const limit = card.credit_limit ?? 0
                            const spend = cardSpend[card.id!] ?? 0
                            const pct = limit > 0 ? Math.min((spend / limit) * 100, 100) : 0
                            return (
                                <div
                                    key={card.id}
                                    className="relative overflow-hidden rounded-2xl p-5 text-white cursor-pointer hover:scale-[1.01] transition-all shadow-md select-none"
                                    style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                                    onClick={() => router.push(`/banks/card?id=${card.id}`)}
                                    title={`Abrir cartão ${card.name}`}
                                >
                                    <div className="pointer-events-none absolute -right-5 -top-5 size-28 rounded-full bg-white/10" />
                                    <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-white/5" />
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-medium opacity-70 mb-0.5">Cartão de crédito</p>
                                            <p className="font-semibold text-sm leading-tight truncate">{card.name}</p>
                                        </div>
                                        <CreditCardIcon className="size-5 opacity-60 shrink-0 ml-2 mt-0.5" />
                                    </div>
                                    {limit > 0 && (
                                        <div className="mb-3">
                                            <div className="flex justify-between text-[11px] opacity-70 mb-1.5">
                                                <span>{fmt(spend)} gasto</span>
                                                <span>Limite {fmt(limit)}</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-white/25">
                                                <div
                                                    className="h-full rounded-full bg-white transition-all"
                                                    style={{ width: `${pct.toFixed(0)}%` }}
                                                />
                                            </div>
                                            <p className="text-[11px] opacity-60 mt-1">{pct.toFixed(0)}% utilizado neste mês</p>
                                        </div>
                                    )}
                                    <div className="flex gap-4 text-[11px] opacity-70 mt-1">
                                        {card.closing_day != null && <span>Fecha: dia {card.closing_day}</span>}
                                        {card.due_day != null && <span>Vence: dia {card.due_day}</span>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Analytics */}
            {!loading && account && (
                <div className="flex flex-col gap-4">
                    <MonthlyIncomeExpenseChart accountId={accountId} />
                    <div className={linkedCards.length > 0 ? "grid gap-4 lg:grid-cols-2" : ""}>
                        <CategoryExpenseChart accountId={accountId} creditCardIds={linkedCards.map((c) => c.id!)} />
                        {linkedCards.length > 0 && (
                            <CreditCardFaturaChart creditCardIds={linkedCards.map((c) => c.id!)} />
                        )}
                    </div>
                    <AccountSubscriptionsCalendar
                        accountId={accountId}
                        creditCardIds={linkedCards.map((c) => c.id!)}
                    />
                </div>
            )}

            {/* Tree table */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between w-full">
                        <div>
                            <CardTitle>Transações por mês</CardTitle>
                            <CardDescription>Clique em um mês para expandir e editar as transações.</CardDescription>
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
                            Nenhuma transação importada para esta conta.
                        </p>
                    ) : (
                        <div className="rounded-md border overflow-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="px-4 py-2.5 text-left font-medium w-[180px]">Mês</th>
                                        <th className="px-4 py-2.5 text-right font-medium w-16">Qtd.</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Entradas</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Saídas</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Investimentos</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Total</th>
                                        <th className="px-4 py-2.5 w-20" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaries.map((s) => {
                                        const isOpen = expanded.has(s.monthYear)
                                        return (
                                            <React.Fragment key={s.monthYear}>
                                                {/* Month summary row */}
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
                                                    <td className="px-4 py-2.5 text-right text-green-600 dark:text-green-400">{fmt(s.income)}</td>
                                                    <td className="px-4 py-2.5 text-right text-red-600 dark:text-red-400">{fmt(s.expense)}</td>
                                                    <td className="px-4 py-2.5 text-right text-amber-600 dark:text-amber-400">{fmt(s.investment)}</td>
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
                                                        <td colSpan={7} className="p-0">
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="border-b bg-muted/40">
                                                                        <th className="pl-10 pr-2 py-1.5 text-left font-medium text-muted-foreground w-[120px]">Data</th>
                                                                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Descrição</th>
                                                                        <th className="px-2 py-1.5 text-right font-medium text-muted-foreground w-[110px]">Valor</th>
                                                                        <th className="px-2 py-1.5 text-center font-medium text-muted-foreground w-[90px]">Tipo</th>
                                                                        <th className="px-2 py-1.5 gap-2 inline-flex items-center text-left font-medium text-muted-foreground w-[140px]">Categoria
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
                                        <td className="px-4 py-2.5 text-right text-green-600 dark:text-green-400">{fmt(totalIncome)}</td>
                                        <td className="px-4 py-2.5 text-right text-red-600 dark:text-red-400">{fmt(totalExpense)}</td>
                                        <td className="px-4 py-2.5 text-right text-amber-600 dark:text-amber-400">{fmt(totalInvestment)}</td>
                                        <td className={`px-4 py-2.5 text-right font-bold ${totalIncome - totalExpense - totalInvestment >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                            {fmt(totalIncome - totalExpense - totalInvestment)}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
            <AddTransactionSheet open={addOpen} onOpenChange={setAddOpen} onSuccess={load} accountId={account?.id ?? null} />
        </div>
    )
}

export default function AccountDetailPageWrapper() {
    return (
        <Suspense>
            <AccountDetailPage />
        </Suspense>
    )
}
