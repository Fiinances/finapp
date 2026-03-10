"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCcw, ArrowRight, TrendingDown } from "lucide-react"
import Link from "next/link"
import type { Subscription } from "@/app/types/electron"

function monthlyEquivalent(amount: number, period: Subscription["period"]): number {
    if (period === "weekly") return (amount * 52) / 12
    if (period === "yearly") return amount / 12
    return amount
}

function yearlyEquivalent(amount: number, period: Subscription["period"]): number {
    if (period === "weekly") return amount * 52
    if (period === "monthly") return amount * 12
    return amount
}

function fmtBRL(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

interface AccountSubscriptionsCalendarProps {
    accountId?: number
    creditCardIds?: number[]
}

export function AccountSubscriptionsCalendar({
    accountId,
    creditCardIds = [],
}: AccountSubscriptionsCalendarProps) {
    const [subs, setSubs] = React.useState<Subscription[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        window.electronAPI?.db.subscriptions
            .list()
            .then((all) => {
                const active = all.filter((s) => s.active === 1)
                if (accountId == null && creditCardIds.length === 0) {
                    setSubs(active)
                } else {
                    setSubs(
                        active.filter(
                            (s) =>
                                s.account_id === accountId ||
                                (s.credit_card_id != null && creditCardIds.includes(s.credit_card_id))
                        )
                    )
                }
            })
            .finally(() => setLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountId, creditCardIds.join(",")])

    if (!loading && subs.length === 0) return null

    const today = new Date()
    const monthlyTotal = subs
        .filter((s) => s.type === "expense")
        .reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.period), 0)

    const yearlyTotal = subs
        .filter((s) => s.type === "expense")
        .reduce((sum, s) => sum + yearlyEquivalent(s.amount, s.period), 0)

    const PERIOD_LABEL: Record<string, string> = {
        weekly: "Semanal",
        monthly: "Mensal",
        yearly: "Anual",
    }

    return (
        <Card>
            <CardHeader className="flex-row items-start justify-between pb-3">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                        Compromissos fixos
                    </CardTitle>
                    <CardDescription>
                        {subs.length} assinatura{subs.length !== 1 ? "s" : ""} vinculada{subs.length !== 1 ? "s" : ""}
                    </CardDescription>
                </div>
                <Link
                    href="/subscriptions"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                >
                    Gerenciar <ArrowRight className="h-3 w-3" />
                </Link>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {loading ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Carregando…</p>
                ) : (
                    <>
                        {/* Summary metrics */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-[10px] text-muted-foreground mb-1">Custo mensal</p>
                                <p className="text-sm font-bold text-red-500">{fmtBRL(monthlyTotal)}</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-[10px] text-muted-foreground mb-1">Custo anual</p>
                                <div className="flex items-center gap-1">
                                    <TrendingDown className="h-3 w-3 text-muted-foreground" />
                                    <p className="text-sm font-bold">{fmtBRL(yearlyTotal)}</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3 col-span-2 sm:col-span-1">
                                <p className="text-[10px] text-muted-foreground mb-1">Ativas</p>
                                <p className="text-sm font-bold">{subs.length}</p>
                            </div>
                        </div>

                        {/* Subscription list */}
                        <div className="flex flex-col gap-2">
                            {subs.map((s) => (
                                <div
                                    key={s.id}
                                    className="flex items-center gap-3 rounded-lg border px-3 py-2"
                                    style={{ borderLeftColor: s.color ?? "#6366f1", borderLeftWidth: 3 }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{s.name}</p>
                                        <p className="text-[11px] text-muted-foreground">{PERIOD_LABEL[s.period]}</p>
                                    </div>
                                    {s.category && (
                                        <Badge variant="secondary" className="text-[10px] shrink-0 hidden sm:inline-flex">
                                            {s.category}
                                        </Badge>
                                    )}
                                    <span className="text-sm font-semibold shrink-0 text-red-500">
                                        {fmtBRL(s.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
