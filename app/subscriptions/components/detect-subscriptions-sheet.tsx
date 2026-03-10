"use client"

import React from "react"
import { Loader2, Plus } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { SubscriptionSheet } from "./subscription-sheet"
import type { RecurringTransaction, Subscription } from "@/app/types/electron"

function formatBRL(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function estimatePeriod(firstDate: string, lastDate: string, occurrences: number): Subscription["period"] {
    if (occurrences < 2) return "monthly"
    const daysDiff =
        (new Date(lastDate).getTime() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24)
    const avgDays = daysDiff / (occurrences - 1)
    if (avgDays <= 10) return "weekly"
    if (avgDays <= 45) return "monthly"
    return "yearly"
}

const PERIOD_LABEL: Record<string, string> = {
    weekly: "Semanal",
    monthly: "Mensal",
    yearly: "Anual",
}

interface DetectSubscriptionsSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubscriptionAdded?: () => void
}

export function DetectSubscriptionsSheet({
    open,
    onOpenChange,
    onSubscriptionAdded,
}: DetectSubscriptionsSheetProps) {
    const [recurring, setRecurring] = React.useState<RecurringTransaction[]>([])
    const [loading, setLoading] = React.useState(false)
    const [addSheetOpen, setAddSheetOpen] = React.useState(false)
    const [prefill, setPrefill] = React.useState<Subscription | null>(null)

    React.useEffect(() => {
        if (!open) return
        setLoading(true)
        window.electronAPI?.db.subscriptions
            .detect()
            .then(setRecurring)
            .finally(() => setLoading(false))
    }, [open])

    function handleAdd(r: RecurringTransaction) {
        const period = estimatePeriod(r.first_date, r.last_date, r.occurrences)
        setPrefill({
            name: r.description,
            amount: r.avg_amount,
            type: "expense",
            period,
            active: 1,
        } as Subscription)
        setAddSheetOpen(true)
    }

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Detectar assinaturas</SheetTitle>
                        <SheetDescription>
                            Transações recorrentes com valor consistente (&lt;5% de variação) que
                            aparecem 3 ou mais vezes. Clique em{" "}
                            <strong>+</strong> para adicionar como assinatura.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-4 px-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-16 text-muted-foreground">
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Analisando transações…
                            </div>
                        ) : recurring.length === 0 ? (
                            <p className="py-10 text-center text-muted-foreground">
                                Nenhuma transação recorrente detectada.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead className="text-right">Valor médio</TableHead>
                                        <TableHead className="text-center">Ocorrências</TableHead>
                                        <TableHead>Período estimado</TableHead>
                                        <TableHead>Primeira → Última</TableHead>
                                        <TableHead className="w-10" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recurring.map((r) => {
                                        const period = estimatePeriod(r.first_date, r.last_date, r.occurrences)
                                        return (
                                            <TableRow key={r.description}>
                                                <TableCell className="font-medium max-w-[200px] truncate">
                                                    {r.description}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-red-500">
                                                    {formatBRL(r.avg_amount)}
                                                    {r.min_amount !== r.max_amount && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {formatBRL(r.min_amount)} – {formatBRL(r.max_amount)}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="secondary">{r.occurrences}×</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{PERIOD_LABEL[period]}</Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {r.first_date} → {r.last_date}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7"
                                                        title="Adicionar como assinatura"
                                                        onClick={() => handleAdd(r)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <SubscriptionSheet
                open={addSheetOpen}
                onOpenChange={setAddSheetOpen}
                subscription={prefill}
                onSuccess={() => {
                    setAddSheetOpen(false)
                    onSubscriptionAdded?.()
                }}
            />
        </>
    )
}
