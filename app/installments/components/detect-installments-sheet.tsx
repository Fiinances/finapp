"use client"

import React from "react"
import { Loader2, Plus, CreditCardIcon } from "lucide-react"
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import type { DetectedInstallment, CreditCard } from "@/app/types/electron"

function formatBRL(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    cards: CreditCard[]
    onGroupAdded?: () => void
}

export function DetectInstallmentsSheet({ open, onOpenChange, cards, onGroupAdded }: Props) {
    const [detected, setDetected] = React.useState<DetectedInstallment[]>([])
    const [loading, setLoading] = React.useState(false)
    const [addingKey, setAddingKey] = React.useState<string | null>(null)
    const [added, setAdded] = React.useState<Set<string>>(new Set())

    React.useEffect(() => {
        if (!open) return
        setAdded(new Set())
        setLoading(true)
        window.electronAPI?.db.installmentGroups.detect()
            .then(r => setDetected(r ?? []))
            .catch(() => toast.error("Erro ao escanear transações"))
            .finally(() => setLoading(false))
    }, [open])

    const cardName = (id: number) => cards.find(c => c.id === id)?.name ?? "—"

    function keyOf(item: DetectedInstallment) {
        return `${item.credit_card_id}::${item.base_description}::${item.total_installments}`
    }

    async function accept(item: DetectedInstallment) {
        const key = keyOf(item)
        setAddingKey(key)
        try {
            await window.electronAPI?.db.installmentGroups.insert({
                credit_card_id: item.credit_card_id,
                description: item.base_description,
                total_amount: item.total_amount,
                installments: item.total_installments,
                first_billing_month: item.first_billing_month,
                category: null,
            })
            toast.success(`"${item.base_description}" cadastrado`)
            setAdded(prev => new Set(prev).add(key))
            onGroupAdded?.()
        } catch {
            toast.error("Erro ao salvar parcelamento")
        } finally {
            setAddingKey(null)
        }
    }

    const visibleItems = detected.filter(item => !added.has(keyOf(item)))

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Detectar parcelamentos</SheetTitle>
                    <SheetDescription>
                        Transações dos últimos 2 meses com padrão de parcela (ex: &quot;3/12&quot;) ainda não
                        vinculadas a um grupo. Clique em <strong>+</strong> para cadastrar.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-4 px-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-muted-foreground">
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Analisando transações…
                        </div>
                    ) : visibleItems.length === 0 ? (
                        <p className="py-10 text-center text-muted-foreground">
                            {detected.length === 0
                                ? "Nenhum parcelamento detectado nos últimos 2 meses."
                                : "Todos os parcelamentos detectados já foram cadastrados."}
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Cartão</TableHead>
                                    <TableHead className="text-center">Parcelas</TableHead>
                                    <TableHead className="text-right">Valor parcela</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>1ª parcela</TableHead>
                                    <TableHead className="text-center">Encontradas</TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visibleItems.map(item => {
                                    const key = keyOf(item)
                                    const isAdding = addingKey === key
                                    return (
                                        <TableRow key={key}>
                                            <TableCell className="font-medium max-w-[180px]">
                                                <TooltipProvider delayDuration={300}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="block truncate cursor-default">{item.base_description}</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom" className="max-w-xs">
                                                            {item.base_description}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <CreditCardIcon className="size-3.5 text-muted-foreground" />
                                                    {cardName(item.credit_card_id)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">{item.total_installments}x</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                {formatBRL(item.installment_amount)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm font-medium">
                                                {formatBRL(item.total_amount)}
                                            </TableCell>
                                            <TableCell className="text-sm">{item.first_billing_month}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline">{item.occurrences} de {item.total_installments}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    disabled={isAdding}
                                                    title="Cadastrar parcelamento"
                                                    onClick={() => accept(item)}
                                                >
                                                    {isAdding
                                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                                        : <Plus className="h-4 w-4" />}
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
    )
}
