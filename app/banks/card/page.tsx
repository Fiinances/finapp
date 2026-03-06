"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeftIcon, CreditCardIcon, Trash2Icon } from "lucide-react"
import ImportDropdown from "@/components/import-dropdown"
import type { Account, CreditCard, Transaction } from "@/app/types/electron"
import { EditCreditCardSheet } from "../components/edit-credit-card-sheet"

interface MonthSummary {
    monthYear: string   // 'MM/YYYY'
    label: string
    count: number
    income: number
    expense: number
    total: number
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
                count: 0, income: 0, expense: 0, total: 0,
            })
        }
        const entry = map.get(ym)!
        entry.count++
        if (t.type === "income") entry.income += t.amount
        else entry.expense += t.amount
        entry.total = entry.income - entry.expense
    }
    return Array.from(map.values()).sort((a, b) => b.monthYear.localeCompare(a.monthYear))
}

function fmt(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default function CardDetailPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const cardId = parseInt(searchParams.get("id") ?? "0", 10)

    const [card, setCard] = React.useState<CreditCard | null>(null)
    const [linkedAccount, setLinkedAccount] = React.useState<Account | null>(null)
    const [summaries, setSummaries] = React.useState<MonthSummary[]>([])
    const [loading, setLoading] = React.useState(true)
    const [deletingMonth, setDeletingMonth] = React.useState<string | null>(null)
    const [editOpen, setEditOpen] = React.useState(false)

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
            setSummaries(buildSummaries(transactions ?? []))
        } catch {
            // outside electron
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => { load() }, [cardId])

    async function handleDeleteMonth(monthYear: string, label: string) {
        if (!cardId) return
        setDeletingMonth(monthYear)
        try {
            await window.electronAPI?.db.creditCards.deleteByMonth(cardId, monthYear)
            toast.success(`Transações de ${label} excluídas`, { position: "top-center" })
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
                        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                            Editar
                        </Button>
                        <ImportDropdown defaultCreditCardId={card.id} onSuccess={load} />
                    </div>
                )}
            </div>

            {/* Card info */}
            {!loading && card && (
                <Card>
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

            {/* Faturas table */}
            <Card>
                <CardHeader>
                    <CardTitle>Faturas</CardTitle>
                    <CardDescription>Histórico de faturas agrupadas por mês.</CardDescription>
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
                                        <th className="px-4 py-2.5 text-left font-medium">Mês</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Qtd.</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Entradas</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Saídas</th>
                                        <th className="px-4 py-2.5 text-right font-medium">Total</th>
                                        <th className="px-4 py-2.5" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaries.map((s) => (
                                        <tr key={s.monthYear} className="border-b last:border-0 hover:bg-muted/30">
                                            <td className="px-4 py-2.5 font-medium">{s.label}</td>
                                            <td className="px-4 py-2.5 text-right text-muted-foreground">{s.count}</td>
                                            <td className="px-4 py-2.5 text-right text-green-600 dark:text-green-400">{fmt(s.income)}</td>
                                            <td className="px-4 py-2.5 text-right text-red-600 dark:text-red-400">{fmt(s.expense)}</td>
                                            <td className={`px-4 py-2.5 text-right font-semibold ${s.total >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                                {fmt(s.total)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
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
                                    ))}
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

            <EditCreditCardSheet
                card={card}
                open={editOpen}
                onOpenChange={setEditOpen}
                onSuccess={load}
            />
        </div>
    )
}
