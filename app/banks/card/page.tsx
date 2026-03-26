"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import MonthPicker from "@/components/month-picker"
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

function parseMaskedAmount(input: string): number {
    const digits = input.replace(/\D/g, "")
    return digits ? parseInt(digits, 10) / 100 : 0
}

function formatAmount(value: number): string {
    return "R$ " + value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(date: string): string {
    // YYYY-MM-DD → DD/MM/YYYY
    const iso = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
    // DD-MM-YYYY → DD/MM/YYYY
    const dmy = date.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
    if (dmy) return `${dmy[1].padStart(2, "0")}/${dmy[2].padStart(2, "0")}/${dmy[3]}`
    return date
}

function parseDateToISO(date: string): string {
    // DD/MM/YYYY → YYYY-MM-DD
    const m = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
    return date
}

interface MonthSummary {
    monthYear: string
    label: string
    count: number
    income: number
    expense: number
    total: number
    transactions: Transaction[]
}

const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

function parseYearMonth(date: string): string {
    if (/^\d{4}-\d{2}/.test(date)) return date.slice(0, 7)
    const br = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (br) return `${br[3]}-${br[2]}`
    return date.slice(0, 7)
}

function buildSummaries(transactions: Transaction[]): MonthSummary[] {
    const map = new Map<string, MonthSummary>()
    for (const t of transactions) {
        let key: string
        let label: string
        if (t.billing_month) {
            key = t.billing_month
            const [mm, yyyy] = t.billing_month.split("/")
            label = `${MONTH_NAMES[parseInt(mm) - 1]} ${yyyy}`
        } else {
            const ym = parseYearMonth(t.date)
            const [year, month] = ym.split("-")
            key = `${month}/${year}`
            label = `${MONTH_NAMES[parseInt(month) - 1]} ${year}`
        }
        if (!map.has(key)) {
            map.set(key, { monthYear: key, label, count: 0, income: 0, expense: 0, total: 0, transactions: [] })
        }
        const entry = map.get(key)!
        entry.count++
        entry.transactions.push(t)
        if (t.type === "income") entry.income += t.amount
        else entry.expense += t.amount
        entry.total = entry.income - entry.expense
    }
    return Array.from(map.values()).sort((a, b) => b.monthYear.localeCompare(a.monthYear))
}

function fmt(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

// ── Inline-editable transaction row (controlled) ────────────────

interface TxRowProps {
    draft: Transaction
    onChange: <K extends keyof Transaction>(field: K, value: Transaction[K]) => void
    onDelete: () => void
    deleting: boolean
}

function TxRow({ draft, onChange, onDelete, deleting }: TxRowProps) {
    const cellCls = "px-2 py-1.5"
    const inputCls = "h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-xs focus:border-input focus:outline-none focus:ring-1 focus:ring-ring hover:border-input/50 transition-colors"

    return (
        <tr className="border-b last:border-0 hover:bg-muted/20 group">
            <td className={cellCls}>
                <input
                    type="text"
                    value={formatDate(draft.date)}
                    onChange={(e) => onChange("date", e.target.value)}
                    className={`${inputCls} w-[100px]`}
                    placeholder="DD/MM/AAAA"
                />
            </td>
            <td className={cellCls}>
                <div className="flex items-center gap-1.5">
                    <input
                        type="text"
                        value={draft.description}
                        onChange={(e) => onChange("description", e.target.value)}
                        className={`${inputCls} min-w-[160px]`}
                    />
                    {draft.installment_number != null && (
                        <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 whitespace-nowrap">
                            {draft.installment_number}x
                        </span>
                    )}
                </div>
            </td>
            <td className={cellCls}>
                <input
                    type="text"
                    inputMode="decimal"
                    value={formatAmount(draft.amount)}
                    onChange={(e) => onChange("amount", parseMaskedAmount(e.target.value))}
                    className={`${inputCls} w-[96px] text-right`}
                />
            </td>
            <td className={`${cellCls} text-center`}>
                <button
                    type="button"
                    onClick={() => {
                        const next: Record<string, Transaction["type"]> = { income: "expense", expense: "investment", investment: "transfer", transfer: "card_payment", card_payment: "income" }
                        onChange("type", next[draft.type] ?? "income")
                    }}
                    title={draft.type === "transfer" ? "Transferências entre contas — não conta como despesa" : draft.type === "card_payment" ? "Pagamento de fatura do cartão — não conta como despesa" : undefined}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer whitespace-nowrap ${draft.type === "income"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : draft.type === "investment"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : draft.type === "transfer"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : draft.type === "card_payment"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                >
                    {draft.type === "income" ? "Entrada" : draft.type === "investment" ? "Investimento" : draft.type === "transfer" ? "Transferência" : draft.type === "card_payment" ? "Pgto. Cartão" : "Saída"}
                </button>
            </td>
            <td className={cellCls}>
                <input
                    list="card-category-options"
                    type="text"
                    value={draft.category ?? ""}
                    onChange={(e) => onChange("category", e.target.value)}
                    placeholder="Categoria…"
                    className={`${inputCls} w-[120px]`}
                />
                <datalist id="card-category-options">
                    {CATEGORIES.map((c) => <option key={c} value={c} />)}
                </datalist>
            </td>
            <td className={cellCls}>
                <MonthPicker
                    value={draft.billing_month ?? ""}
                    onChange={(v) => onChange("billing_month", v || null)}
                    className={`${inputCls} w-[90px]`}
                />
            </td>
            <td className={`${cellCls} text-right`}>
                <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={deleting}
                    onClick={onDelete}
                    title="Excluir"
                >
                    <Trash2Icon className="size-3.5" />
                </Button>
            </td>
        </tr>
    )
}

// ── Month rows with batch save ────────────────────────────────────

interface MonthRowsProps {
    transactions: Transaction[]
    drafts: Record<number, Transaction>
    onDraftChange: <K extends keyof Transaction>(id: number, field: K, value: Transaction[K]) => void
    onSaved: () => void
}

function MonthRows({ transactions, drafts, onDraftChange, onSaved }: MonthRowsProps) {
    const [saving, setSaving] = React.useState(false)
    const [deletingId, setDeletingId] = React.useState<number | null>(null)

    const dirtyEntries = transactions.filter(
        t => t.id != null && JSON.stringify(drafts[t.id]) !== JSON.stringify(t)
    )

    async function saveAll() {
        const invalid = dirtyEntries.filter(t => {
            const bm = drafts[t.id!].billing_month
            return bm != null && bm !== "" && !/^(0[1-9]|1[0-2])\/\d{4}$/.test(bm)
        })
        if (invalid.length > 0) {
            toast.error(
                `Mês da fatura inválido em ${invalid.length} transação(ões). Use o formato MM/AAAA.`,
                { position: "top-center" }
            )
            return
        }
        setSaving(true)
        try {
            await Promise.all(dirtyEntries.map(t =>
                window.electronAPI?.db.transactions.update(t.id!, {
                    date: parseDateToISO(drafts[t.id!].date),
                    description: drafts[t.id!].description,
                    amount: drafts[t.id!].amount,
                    type: drafts[t.id!].type,
                    category: drafts[t.id!].category,
                    billing_month: drafts[t.id!].billing_month,
                })
            ))
            toast.success(`${dirtyEntries.length} transação(ões) salva(s)`, { position: "top-center" })
            onSaved()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao salvar")
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id: number) {
        setDeletingId(id)
        try {
            await window.electronAPI?.db.transactions.delete(id)
            onSaved()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao excluir")
            setDeletingId(null)
        }
    }

    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))

    return (
        <>
            {sorted.map(tx => (
                <TxRow
                    key={tx.id}
                    draft={drafts[tx.id!] ?? tx}
                    onChange={(field, value) => onDraftChange(tx.id!, field, value)}
                    onDelete={() => handleDelete(tx.id!)}
                    deleting={deletingId === tx.id}
                />
            ))}
            {dirtyEntries.length > 0 && (
                <tr className="bg-primary/5 border-t">
                    <td colSpan={7} className="px-3 py-2 text-right">
                        <Button size="sm" disabled={saving} onClick={saveAll}>
                            <SaveIcon className="size-3.5 mr-1.5" />
                            {saving ? "Salvando…" : `Salvar ${dirtyEntries.length} alteração(ões)`}
                        </Button>
                    </td>
                </tr>
            )}
        </>
    )
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
                                                                        onSaved={load}
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
