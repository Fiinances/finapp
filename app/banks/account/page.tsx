"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeftIcon, ChevronDownIcon, ChevronRightIcon, SaveIcon, Trash2Icon } from "lucide-react"
import ImportDropdown from "@/components/import-dropdown"
import type { Account, Transaction } from "@/app/types/electron"

const CATEGORIES = [
    "Alimentação", "Transporte", "Moradia", "Saúde", "Educação",
    "Lazer", "Vestuário", "Salário", "Investimento", "Transferência", "Boleto", "Outros",
]

function parseMaskedAmount(input: string): number {
    const digits = input.replace(/\D/g, "")
    return digits ? parseInt(digits, 10) / 100 : 0
}

function formatAmount(value: number): string {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface MonthSummary {
    monthYear: string   // 'MM/YYYY'
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
        const ym = parseYearMonth(t.date)
        if (!map.has(ym)) {
            const [year, month] = ym.split("-")
            map.set(ym, {
                monthYear: `${month}/${year}`,
                label: `${MONTH_NAMES[parseInt(month) - 1]} ${year}`,
                count: 0, income: 0, expense: 0, total: 0, transactions: [],
            })
        }
        const entry = map.get(ym)!
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

// ── Inline-editable transaction row ──────────────────────────────

interface TxRowProps {
    tx: Transaction
    onSaved: () => void
}

function TxRow({ tx, onSaved }: TxRowProps) {
    const [draft, setDraft] = React.useState<Transaction>({ ...tx })
    const [saving, setSaving] = React.useState(false)
    const [deleting, setDeleting] = React.useState(false)
    const isDirty = JSON.stringify(draft) !== JSON.stringify(tx)

    function set<K extends keyof Transaction>(field: K, value: Transaction[K]) {
        setDraft((prev) => ({ ...prev, [field]: value }))
    }

    async function save() {
        if (!tx.id) return
        setSaving(true)
        try {
            await window.electronAPI?.db.transactions.update(tx.id, {
                date: draft.date,
                description: draft.description,
                amount: draft.amount,
                type: draft.type,
                category: draft.category,
            })
            toast.success("Transação atualizada", { position: "top-center" })
            onSaved()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao salvar")
        } finally {
            setSaving(false)
        }
    }

    async function deleteTx() {
        if (!tx.id) return
        setDeleting(true)
        try {
            await window.electronAPI?.db.transactions.delete(tx.id)
            onSaved()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao excluir")
            setDeleting(false)
        }
    }

    const cellCls = "px-2 py-1.5"
    const inputCls = "h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-xs focus:border-input focus:outline-none focus:ring-1 focus:ring-ring hover:border-input/50 transition-colors"

    return (
        <tr className="border-b last:border-0 hover:bg-muted/20 group">
            {/* Date */}
            <td className={cellCls}>
                <input
                    type="text"
                    value={draft.date}
                    onChange={(e) => set("date", e.target.value)}
                    className={`${inputCls} w-[100px]`}
                    placeholder="DD/MM/AAAA"
                />
            </td>
            {/* Description */}
            <td className={cellCls}>
                <input
                    type="text"
                    value={draft.description}
                    onChange={(e) => set("description", e.target.value)}
                    className={`${inputCls} min-w-[160px]`}
                />
            </td>
            {/* Amount */}
            <td className={cellCls}>
                <input
                    type="text"
                    inputMode="decimal"
                    value={formatAmount(draft.amount)}
                    onChange={(e) => set("amount", parseMaskedAmount(e.target.value))}
                    className={`${inputCls} w-[96px] text-right`}
                />
            </td>
            {/* Type */}
            <td className={`${cellCls} text-center`}>
                <button
                    type="button"
                    onClick={() => set("type", draft.type === "income" ? "expense" : "income")}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer whitespace-nowrap ${draft.type === "income"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                >
                    {draft.type === "income" ? "Entrada" : "Saída"}
                </button>
            </td>
            {/* Category */}
            <td className={cellCls}>
                <input
                    list="account-category-options"
                    type="text"
                    value={draft.category ?? ""}
                    onChange={(e) => set("category", e.target.value)}
                    placeholder="Categoria…"
                    className={`${inputCls} w-[120px]`}
                />
                <datalist id="account-category-options">
                    {CATEGORIES.map((c) => <option key={c} value={c} />)}
                </datalist>
            </td>
            {/* Actions */}
            <td className={`${cellCls} text-right`}>
                <div className="flex items-center justify-end gap-1">
                    {isDirty && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-primary hover:text-primary"
                            disabled={saving}
                            onClick={save}
                            title="Salvar"
                        >
                            <SaveIcon className="size-3.5" />
                        </Button>
                    )}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={deleting}
                        onClick={deleteTx}
                        title="Excluir"
                    >
                        <Trash2Icon className="size-3.5" />
                    </Button>
                </div>
            </td>
        </tr>
    )
}

// ── Page ─────────────────────────────────────────────────────────

export default function AccountDetailPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const accountId = parseInt(searchParams.get("id") ?? "0", 10)

    const [account, setAccount] = React.useState<Account | null>(null)
    const [summaries, setSummaries] = React.useState<MonthSummary[]>([])
    const [loading, setLoading] = React.useState(true)
    const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
    const [deletingMonth, setDeletingMonth] = React.useState<string | null>(null)

    async function load() {
        if (!accountId) return
        setLoading(true)
        try {
            const [accounts, transactions] = await Promise.all([
                window.electronAPI?.db.accounts.list() ?? [],
                window.electronAPI?.db.transactions.list({ accountId }) ?? [],
            ])
            const found = (accounts ?? []).find((a) => a.id === accountId) ?? null
            setAccount(found)
            setSummaries(buildSummaries(transactions ?? []))
        } catch {
            // outside electron
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => { load() }, [accountId])

    function toggleExpand(monthYear: string) {
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(monthYear)) next.delete(monthYear)
            else next.add(monthYear)
            return next
        })
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
                <div className="grid gap-3 sm:grid-cols-3">
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
                                                                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-[140px]">Categoria</th>
                                                                        <th className="px-2 py-1.5 w-16" />
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {s.transactions
                                                                        .slice()
                                                                        .sort((a, b) => a.date.localeCompare(b.date))
                                                                        .map((tx) => (
                                                                            <TxRow key={tx.id} tx={tx} onSaved={load} />
                                                                        ))
                                                                    }
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
                                        <td className={`px-4 py-2.5 text-right font-bold ${totalIncome - totalExpense >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                            {fmt(totalIncome - totalExpense)}
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
