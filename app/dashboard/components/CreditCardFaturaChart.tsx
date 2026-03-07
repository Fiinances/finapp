"use client"

import React from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import type { CreditCard, Transaction } from "@/app/types/electron"

const FALLBACK_COLORS = [
    "#6366f1", "#f59e0b", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#3b82f6", "#84cc16",
]

function txBillingMonth(t: Transaction): string {
    if (t.billing_month) return t.billing_month
    if (/^\d{4}-\d{2}-\d{2}/.test(t.date)) return `${t.date.slice(5, 7)}/${t.date.slice(0, 4)}`
    const br = t.date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (br) return `${br[2]}/${br[3]}`
    return ""
}

function fmtK(v: number): string {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`
    return String(v)
}

function fmtCurrency(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

interface CreditCardFaturaChartProps {
    creditCardIds?: number[]
}

export function CreditCardFaturaChart({ creditCardIds }: CreditCardFaturaChartProps = {}) {
    const [cards, setCards] = React.useState<CreditCard[]>([])
    const [transactions, setTransactions] = React.useState<Transaction[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const [c, t] = await Promise.all([
                    window.electronAPI?.db.creditCards.list() ?? [],
                    window.electronAPI?.db.transactions.list() ?? [],
                ])
                setCards(c ?? [])
                setTransactions(t ?? [])
            } catch { /* outside electron */ }
            finally { setLoading(false) }
        }
        load()
    }, [])

    // Last 6 billing months in MM/YYYY
    const now = new Date()
    const last6: string[] = []
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        last6.push(`${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`)
    }

    // Group: billingMonth -> cardId -> totalExpense
    const grouped: Record<string, Record<number, number>> = {}
    for (const m of last6) grouped[m] = {}
    for (const t of transactions) {
        if (t.credit_card_id == null || t.type !== "expense") continue
        const bm = txBillingMonth(t)
        if (!grouped[bm]) continue
        grouped[bm][t.credit_card_id] = (grouped[bm][t.credit_card_id] ?? 0) + t.amount
    }

    const filteredCards = creditCardIds != null
        ? cards.filter((c) => creditCardIds.includes(c.id!))
        : cards

    const chartData = last6.map((m) => {
        const entry: Record<string, unknown> = { month: m }
        for (const card of filteredCards) {
            entry[String(card.id)] = parseFloat((grouped[m][card.id!] ?? 0).toFixed(2))
        }
        return entry
    })

    const chartConfig: ChartConfig = filteredCards.reduce<ChartConfig>((cfg, card, i) => {
        cfg[String(card.id)] = {
            label: card.name,
            color: card.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        }
        return cfg
    }, {})

    const hasData = filteredCards.length > 0 && transactions.some(
        (t) => t.credit_card_id != null && t.type === "expense" && filteredCards.some((c) => c.id === t.credit_card_id)
    )

    return (
        <Card>
            <CardHeader>
                <CardTitle>Faturas do cartão de crédito</CardTitle>
                <CardDescription>Gastos mensais por cartão — últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Carregando…</div>
                ) : !hasData || filteredCards.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">
                        {filteredCards.length === 0 ? "Nenhum cartão cadastrado." : "Nenhuma fatura importada ainda."}
                    </p>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-3 mb-4 text-xs">
                            {filteredCards.map((card, i) => (
                                <div key={card.id} className="flex items-center gap-1.5">
                                    <span
                                        className="size-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: card.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
                                    />
                                    <span className="text-muted-foreground">{card.name}</span>
                                </div>
                            ))}
                        </div>
                        <ChartContainer config={chartConfig} className="h-[260px] w-full">
                            <BarChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
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
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(v) => fmtCurrency(v as number)}
                                        />
                                    }
                                />
                                {filteredCards.map((card, i) => (
                                    <Bar
                                        key={card.id}
                                        dataKey={String(card.id)}
                                        fill={card.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={28}
                                    />
                                ))}
                            </BarChart>
                        </ChartContainer>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
