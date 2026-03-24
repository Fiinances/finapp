"use client"

import React from "react"
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import type { Transaction } from "@/app/types/electron"

function parseYearMonth(raw: string): string {
    if (/^\d{4}-\d{2}/.test(raw)) return raw.slice(0, 7)
    const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (br) return `${br[3]}-${br[2]}`
    return ""
}

function formatMonthLabel(ym: string): string {
    const [year, month] = ym.split("-")
    const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    return `${MONTHS[parseInt(month, 10) - 1]}/${year.slice(2)}`
}

function fmtK(v: number): string {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`
    return String(v)
}

const chartConfig: ChartConfig = {
    income: { label: "Receitas", color: "#22c55e" },
    expense: { label: "Despesas", color: "#ef4444" },
    investment: { label: "Investimentos", color: "#f59e0b" },
    net: { label: "Saldo líquido", color: "#6366f1" },
}

interface MonthlyIncomeExpenseChartProps {
    accountId?: number
}

export function MonthlyIncomeExpenseChart({ accountId }: MonthlyIncomeExpenseChartProps = {}) {
    const [transactions, setTransactions] = React.useState<Transaction[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const txns = await window.electronAPI?.db.transactions.list(
                    accountId != null ? { accountId } : undefined
                ) ?? []
                setTransactions(txns)
            } catch { /* outside electron */ }
            finally { setLoading(false) }
        }
        load()
    }, [accountId])

    const now = new Date()
    const months: string[] = []
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
    }

    const grouped: Record<string, { income: number; expense: number; investment: number }> = {}
    for (const m of months) grouped[m] = { income: 0, expense: 0, investment: 0 }

    for (const t of transactions) {
        const ym = parseYearMonth(t.date)
        if (!grouped[ym]) continue
        if (t.type === "transfer" || t.type === "card_payment") continue
        if (t.type === "income") grouped[ym].income += t.amount
        else if (t.type === "investment") grouped[ym].investment += t.amount
        else grouped[ym].expense += t.amount
    }

    const chartData = months.map((m) => ({
        month: formatMonthLabel(m),
        income: parseFloat(grouped[m].income.toFixed(2)),
        expense: parseFloat(grouped[m].expense.toFixed(2)),
        investment: parseFloat(grouped[m].investment.toFixed(2)),
        net: parseFloat((grouped[m].income - grouped[m].expense).toFixed(2)),
    }))

    return (
        <Card>
            <CardHeader>
                <CardTitle>Receitas vs. Despesas</CardTitle>
                <CardDescription>Comparativo mensal com saldo líquido — últimos 12 meses</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Carregando…</div>
                ) : transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Nenhuma transação encontrada.</p>
                ) : (
                    <>
                        <div className="flex gap-4 mb-4 text-xs">
                            {Object.entries(chartConfig).map(([key, cfg]) => (
                                <div key={key} className="flex items-center gap-1.5">
                                    <span
                                        className="size-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: cfg.color }}
                                    />
                                    <span className="text-muted-foreground">{cfg.label as string}</span>
                                </div>
                            ))}
                        </div>
                        <ChartContainer config={chartConfig} className="h-[280px] w-full">
                            <ComposedChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    width={52}
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={fmtK}
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                                <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                                <Bar dataKey="investment" fill="var(--color-investment)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                                <Line
                                    type="monotone"
                                    dataKey="net"
                                    stroke="var(--color-net)"
                                    strokeWidth={2}
                                    dot={{ r: 3, fill: "var(--color-net)" }}
                                />
                            </ComposedChart>
                        </ChartContainer>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
