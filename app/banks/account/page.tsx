"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeftIcon, ChevronDownIcon, ChevronRightIcon, SaveIcon, Trash2Icon, CreditCardIcon, Wand } from "lucide-react"
import ImportDropdown from "@/components/import-dropdown"
import { MonthlyIncomeExpenseChart } from "@/app/dashboard/components/MonthlyIncomeExpenseChart"
import { CategoryExpenseChart } from "@/app/dashboard/components/CategoryExpenseChart"
import { CreditCardFaturaChart } from "@/app/dashboard/components/CreditCardFaturaChart"
import { Suspense } from "react"
import type { Account, Transaction, CreditCard } from "@/app/types/electron"

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

interface MonthSummary {
    monthYear: string   // 'MM/YYYY'
    label: string
    count: number
    income: number
    expense: number
    investment: number
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
        const ym = parseYearMonth(t.date)
        if (!map.has(ym)) {
            const [year, month] = ym.split("-")
            map.set(ym, {
                monthYear: `${month}/${year}`,
                label: `${MONTH_NAMES[parseInt(month) - 1]} ${year}`,
                count: 0, income: 0, expense: 0, investment: 0, total: 0, transactions: [],
            })
        }
        const entry = map.get(ym)!
        entry.count++
        entry.transactions.push(t)
        if (t.type === "income") entry.income += t.amount
        else if (t.type === "investment") entry.investment += t.amount
        else entry.expense += t.amount
        entry.total = entry.income - entry.expense - entry.investment
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
            {/* Date */}
            <td className={cellCls}>
                <input
                    type="text"
                    value={formatDate(draft.date)}
                    onChange={(e) => onChange("date", e.target.value)}
                    className={`${inputCls} w-[100px]`}
                    placeholder="DD/MM/AAAA"
                />
            </td>
            {/* Description */}
            <td className={cellCls}>
                <input
                    type="text"
                    value={draft.description}
                    onChange={(e) => onChange("description", e.target.value)}
                    className={`${inputCls} min-w-[160px]`}
                />
            </td>
            {/* Amount */}
            <td className={cellCls}>
                <input
                    type="text"
                    inputMode="decimal"
                    value={formatAmount(draft.amount)}
                    onChange={(e) => onChange("amount", parseMaskedAmount(e.target.value))}
                    className={`${inputCls} w-[96px] text-right`}
                />
            </td>
            {/* Type */}
            <td className={`${cellCls} text-center`}>
                <button
                    type="button"
                    onClick={() => onChange("type", draft.type === "income" ? "expense" : draft.type === "expense" ? "investment" : "income")}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer whitespace-nowrap ${draft.type === "income"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : draft.type === "investment"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                >
                    {draft.type === "income" ? "Entrada" : draft.type === "investment" ? "Investimento" : "Saída"}
                </button>
            </td>
            {/* Category */}
            <td className={cellCls}>
                <input
                    list="account-category-options"
                    type="text"
                    value={draft.category ?? ""}
                    onChange={(e) => onChange("category", e.target.value)}
                    placeholder="Categoria…"
                    className={`${inputCls} w-[120px]`}
                />
                <datalist id="account-category-options">
                    {CATEGORIES.map((c) => <option key={c} value={c} />)}
                </datalist>
            </td>
            {/* Actions */}
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
        setSaving(true)
        try {
            await Promise.all(dirtyEntries.map(t =>
                window.electronAPI?.db.transactions.update(t.id!, {
                    date: drafts[t.id!].date,
                    description: drafts[t.id!].description,
                    amount: drafts[t.id!].amount,
                    type: drafts[t.id!].type,
                    category: drafts[t.id!].category,
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
                    <td colSpan={6} className="px-3 py-2 text-right">
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

function txBillingMonth(t: Transaction): string {
    if (t.billing_month) return t.billing_month
    if (/^\d{4}-\d{2}-\d{2}/.test(t.date)) return `${t.date.slice(5, 7)}/${t.date.slice(0, 4)}`
    const br = t.date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (br) return `${br[2]}/${br[3]}`
    return ""
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
    const [linkedCards, setLinkedCards] = React.useState<CreditCard[]>([])
    const [cardSpend, setCardSpend] = React.useState<Record<number, number>>({})

    function handleDraftChange<K extends keyof Transaction>(id: number, field: K, value: Transaction[K]) {
        setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
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

        try {
            const categories = await window.electronAPI?.ai.categorize(uncategorized)
            if (categories) {
                categories.forEach((cat, i) => {
                    handleDraftChange(uncategorized[i].id!, "category", cat)
                })
                toast.success(`${uncategorized.length} transação(ões) categorizadas`, { position: "top-center" })
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao categorizar")
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
                <Button variant="secondary" size="icon" onClick={() => router.back()}>
                    <ArrowLeftIcon className="size-4" />
                </Button>
                {account && (
                    <div className="flex items-center gap-2 flex-1">
                        <span className="size-4 rounded-full shrink-0" style={{ backgroundColor: account.color ?? "#6366f1" }} />
                        <div className="flex-1">
                            <h1 className="text-lg font-semibold leading-none">{account.name}</h1>
                            {account.bank && <p className="text-sm text-muted-foreground">{account.bank}</p>}
                        </div>
                        <ImportDropdown defaultAccountId={account.id} onSuccess={load} />
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
                </div>
            )}

            {/* Tree table */}
            <Card>
                <CardHeader>
                    <CardTitle>Transações por mês</CardTitle>
                    <CardDescription>Clique em um mês para expandir e editar as transações.</CardDescription>
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
                                                                                className="rounded cursor-pointer p-1 gap-2 text-muted-foreground hover:bg-green-500/10 transition-colors"
                                                                            >
                                                                                <Wand className="size-4" />
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
