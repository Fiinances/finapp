"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeftIcon, Trash2Icon } from "lucide-react"
import ImportDropdown from "@/components/import-dropdown"
import type { Account, Transaction } from "@/app/types/electron"

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

export default function AccountDetailPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const accountId = parseInt(searchParams.get("id") ?? "0", 10)

    const [account, setAccount] = React.useState<Account | null>(null)
    const [summaries, setSummaries] = React.useState<MonthSummary[]>([])
    const [loading, setLoading] = React.useState(true)
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

    async function handleDeleteMonth(monthYear: string, label: string) {
        if (!accountId) return
        setDeletingMonth(monthYear)
        try {
            console.log("Deleting transactions for month", monthYear, "account", accountId)
            await window.electronAPI?.db.transactions.deleteByMonth(accountId, monthYear)
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
                <Button variant="secondary" size="icon" onClick={() => router.back()}>
                    <ArrowLeftIcon className="size-4" />
                </Button>
                {account && (
                    <div className="flex items-center gap-2 flex-1">
                        <span className="size-4 rounded-full shrink-0" style={{ backgroundColor: account.color ?? "#6366f1" }} />
                        <div className="flex-1">
                            <h1 className="text-lg font-semibold leading-none">{account.name}</h1>
                            {account.bank && (
                                <p className="text-sm text-muted-foreground">{account.bank}</p>
                            )}
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

            {/* Main table */}
            <Card>
                <CardHeader>
                    <CardTitle>Importações por mês</CardTitle>
                    <CardDescription>Resumo das transações agrupadas por mês.</CardDescription>
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
        </div>
    )
}
