"use client"

import React from "react"
import { PieChart, Pie, Cell, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card"
import type { Transaction } from "@/app/types/electron"

const COLORS = [
    "#6366f1", "#f59e0b", "#ef4444", "#22c55e", "#3b82f6",
    "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#84cc16", "#06b6d4", "#a78bfa",
]

const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

function parseYearMonth(raw: string): string {
    if (/^\d{4}-\d{2}/.test(raw)) return raw.slice(0, 7)
    const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (br) return `${br[3]}-${br[2]}`
    return ""
}

function fmtCurrency(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function CategoryExpenseChart() {
    const now = new Date()
    const [year, setYear] = React.useState(now.getFullYear())
    const [month, setMonth] = React.useState(now.getMonth() + 1)
    const [transactions, setTransactions] = React.useState<Transaction[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const txns = await window.electronAPI?.db.transactions.list() ?? []
                setTransactions(txns)
            } catch { /* outside electron */ }
            finally { setLoading(false) }
        }
        load()
    }, [])

    const yearOptions = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()]
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`

    const grouped: Record<string, number> = {}
    for (const t of transactions) {
        if (t.type !== "expense") continue
        if (parseYearMonth(t.date) !== monthPrefix) continue
        const cat = t.category?.trim() || "Sem categoria"
        grouped[cat] = (grouped[cat] ?? 0) + t.amount
    }

    const data = Object.entries(grouped)
        .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
        .sort((a, b) => b.value - a.value)

    const total = data.reduce((s, d) => s + d.value, 0)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Despesas por categoria</CardTitle>
                <CardDescription>Distribuição dos gastos no mês selecionado</CardDescription>
                <CardAction>
                    <div className="flex items-center gap-2">
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            {MONTH_NAMES.map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
                        </select>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Carregando…</div>
                ) : data.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Nenhuma despesa registrada neste mês.</p>
                ) : (
                    <div className="flex gap-6 items-center">
                        <div className="shrink-0">
                            <PieChart width={180} height={180}>
                                <Pie
                                    data={data}
                                    cx={85}
                                    cy={85}
                                    innerRadius={48}
                                    outerRadius={82}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {data.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(v: unknown) => [fmtCurrency(v as number), ""]}
                                    contentStyle={{ fontSize: 12 }}
                                />
                            </PieChart>
                            <p className="text-center text-xs text-muted-foreground -mt-1">
                                {fmtCurrency(total)}
                            </p>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                            {data.slice(0, 9).map((d, i) => (
                                <div key={d.name} className="flex items-center gap-2 text-xs">
                                    <span
                                        className="size-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                    />
                                    <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
                                    <span className="font-medium whitespace-nowrap">{fmtCurrency(d.value)}</span>
                                    <span className="text-muted-foreground w-9 text-right">
                                        {total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : ""}
                                    </span>
                                </div>
                            ))}
                            {data.length > 9 && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    +{data.length - 9} outras categorias
                                </p>
                            )}
                            <div className="border-t mt-1 pt-1.5 flex justify-between text-xs font-semibold">
                                <span>Total</span>
                                <span>{fmtCurrency(total)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
