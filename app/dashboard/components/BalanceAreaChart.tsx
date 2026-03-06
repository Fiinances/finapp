"use client"

import React from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardAction, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import type { Account, Transaction } from "@/app/types/electron"

function parseToIso(raw: string): string {
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
    const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (br) return `${br[3]}-${br[2]}-${br[1]}`
    return raw
}

function getDaysOfMonth(year: number, month: number): string[] {
    const daysInMonth = new Date(year, month, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1
        return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    })
}

const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

export function BalanceAreaChart() {
    const now = new Date()
    const [year, setYear] = React.useState(now.getFullYear())
    const [month, setMonth] = React.useState(now.getMonth() + 1)
    const [accounts, setAccounts] = React.useState<Account[]>([])
    const [transactions, setTransactions] = React.useState<Transaction[]>([])
    const [hidden, setHidden] = React.useState<Set<string>>(new Set())
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const [accs, txns] = await Promise.all([
                    window.electronAPI?.db.accounts.list() ?? [],
                    window.electronAPI?.db.transactions.list() ?? [],
                ])
                console.log(txns)
                setAccounts(accs ?? [])
                setTransactions(txns ?? [])
            } catch {
                // outside electron
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const days = getDaysOfMonth(year, month)
    const monthPrefix = `${String(year)}-${String(month).padStart(2, "0")}`

    const chartData = days.map((day) => {
        const entry: Record<string, unknown> = { day }
        for (const account of accounts) {
            const cumulative = transactions.reduce((sum, t) => {
                if (t.account_id !== account.id) return sum
                const iso = parseToIso(t.date)
                if (iso.startsWith(monthPrefix) && iso <= day) {
                    return sum + (t.type === "income" ? t.amount : -t.amount)
                }
                return sum
            }, 0)
            entry[String(account.id)] = parseFloat(cumulative.toFixed(2))
        }
        return entry
    })

    const chartConfig = accounts.reduce<ChartConfig>((cfg, acc) => {
        cfg[String(acc.id)] = { label: acc.name, color: acc.color ?? "#6366f1" }
        return cfg
    }, {})

    function toggleLine(key: string) {
        setHidden((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    const yearOptions = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()]

    return (
        <Card>
            <CardHeader>
                <CardTitle>Saldo por conta</CardTitle>
                <CardDescription>
                    Evolução do saldo diário por conta bancária.
                </CardDescription>
                <CardAction>
                    <div className="flex items-center gap-2">
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            {MONTH_NAMES.map((name, i) => (
                                <option key={i + 1} value={i + 1}>{name}</option>
                            ))}
                        </select>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            {yearOptions.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                        Carregando…
                    </div>
                ) : accounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">
                        Nenhuma conta cadastrada.
                    </p>
                ) : (
                    <>
                        {/* Toggle buttons */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {accounts.map((acc) => {
                                const key = String(acc.id)
                                const isHidden = hidden.has(key)
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => toggleLine(key)}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-opacity"
                                        style={{
                                            borderColor: acc.color ?? "#6366f1",
                                            color: acc.color ?? "#6366f1",
                                            opacity: isHidden ? 0.35 : 1,
                                        }}
                                    >
                                        <span
                                            className="size-2 rounded-full shrink-0"
                                            style={{ backgroundColor: acc.color ?? "#6366f1" }}
                                        />
                                        {acc.name}
                                    </button>
                                )
                            })}
                        </div>

                        <ChartContainer config={chartConfig} className="min-h-[240px] w-full">
                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 8, bottom: 0 }}>
                                <defs>
                                    {accounts.map((acc) => (
                                        <linearGradient key={acc.id} id={`grad-${acc.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={acc.color ?? "#6366f1"} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={acc.color ?? "#6366f1"} stopOpacity={0} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="day"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    interval={4}
                                    tickFormatter={(iso: string) => {
                                        const [y, m, d] = iso.split("-")
                                        return `${d}/${m}/${y}`
                                    }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={4}
                                    width={88}
                                    tickFormatter={(v) =>
                                        Number(v).toLocaleString("pt-BR", {
                                            style: "currency",
                                            currency: "BRL",
                                            maximumFractionDigits: 0,
                                        })
                                    }
                                />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            labelFormatter={(label) => {
                                                const [y, m, d] = (label as string).split("-")
                                                return `${d}/${m}/${y}`
                                            }}
                                            formatter={(value, name) => [
                                                Number(value).toLocaleString("pt-BR", {
                                                    style: "currency",
                                                    currency: "BRL",
                                                }),
                                                chartConfig[name as string]?.label ?? name,
                                            ]}
                                        />
                                    }
                                />
                                {accounts.map((acc) => {
                                    const key = String(acc.id)
                                    return (
                                        <Area
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            name={key}
                                            stroke={acc.color ?? "#6366f1"}
                                            strokeWidth={2}
                                            fill={`url(#grad-${acc.id})`}
                                            dot={false}
                                            activeDot={{ r: 4 }}
                                            hide={hidden.has(key)}
                                        />
                                    )
                                })}
                            </AreaChart>
                        </ChartContainer>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
