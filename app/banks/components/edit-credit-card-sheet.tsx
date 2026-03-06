"use client"

import React from "react"
import { toast } from "sonner"
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { Account, CreditCard } from "@/app/types/electron"

interface EditCreditCardSheetProps {
    card: CreditCard | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function EditCreditCardSheet({ card, open, onOpenChange, onSuccess }: EditCreditCardSheetProps) {
    const [accountId, setAccountId] = React.useState("")
    const [name, setName] = React.useState("")
    const [color, setColor] = React.useState("#6366f1")
    const [limitDigits, setLimitDigits] = React.useState("")
    const [closingDay, setClosingDay] = React.useState("")
    const [dueDay, setDueDay] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const [accounts, setAccounts] = React.useState<Account[]>([])

    React.useEffect(() => {
        if (card) {
            setAccountId(String(card.account_id))
            setName(card.name)
            setColor(card.color ?? "#6366f1")
            setLimitDigits(card.credit_limit != null ? String(Math.round(card.credit_limit * 100)) : "")
            setClosingDay(card.closing_day != null ? String(card.closing_day) : "")
            setDueDay(card.due_day != null ? String(card.due_day) : "")
        }
    }, [card])

    React.useEffect(() => {
        if (open) {
            window.electronAPI?.db.accounts.list().then(data => {
                setAccounts(data ?? [])
            }).catch(() => { })
        }
    }, [open])

    function formatCurrency(digits: string): string {
        const num = parseInt(digits || "0", 10)
        return (num / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
        })
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim() || !card?.id || !accountId) return

        setLoading(true)
        try {
            await window.electronAPI?.db.creditCards.update(card.id, {
                account_id: parseInt(accountId, 10),
                name: name.trim(),
                color,
                credit_limit: limitDigits ? parseInt(limitDigits, 10) / 100 : undefined,
                closing_day: closingDay ? parseInt(closingDay, 10) : undefined,
                due_day: dueDay ? parseInt(dueDay, 10) : undefined,
            })
            toast.success("Cartão atualizado com sucesso", { position: "top-center" })
            onOpenChange(false)
            onSuccess?.()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao atualizar cartão")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" showCloseButton>
                <SheetHeader>
                    <SheetTitle>Editar cartão de crédito</SheetTitle>
                    <SheetDescription>
                        Altere os dados e salve para atualizar.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={onSubmit} className="flex flex-col gap-4 p-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ecc-account">
                            Conta bancária <span className="text-destructive">*</span>
                        </Label>
                        <select
                            id="ecc-account"
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            required
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            {accounts.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.name}{a.bank ? ` — ${a.bank}` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ecc-name">Nome do cartão</Label>
                        <Input
                            id="ecc-name"
                            placeholder="Ex: Nubank Platinum…"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ecc-color">Cor</Label>
                        <div className="flex items-center gap-3">
                            <input
                                id="ecc-color"
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="size-10 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                            />
                            <span className="text-sm text-muted-foreground font-mono">{color}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ecc-limit">Limite (R$)</Label>
                        <Input
                            id="ecc-limit"
                            type="text"
                            inputMode="numeric"
                            placeholder="R$ 0,00"
                            value={limitDigits ? formatCurrency(limitDigits) : ""}
                            onChange={(e) => setLimitDigits(e.target.value.replace(/\D/g, ""))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="ecc-closing">Dia de fechamento</Label>
                            <Input
                                id="ecc-closing"
                                type="number"
                                min={1}
                                max={28}
                                placeholder="Ex: 10"
                                value={closingDay}
                                onChange={(e) => setClosingDay(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="ecc-due">Dia de vencimento</Label>
                            <Input
                                id="ecc-due"
                                type="number"
                                min={1}
                                max={28}
                                placeholder="Ex: 15"
                                value={dueDay}
                                onChange={(e) => setDueDay(e.target.value)}
                            />
                        </div>
                    </div>

                    <SheetFooter>
                        <div className="flex items-center justify-end gap-2">
                            <SheetClose asChild>
                                <Button variant="ghost" disabled={loading}>
                                    Cancelar
                                </Button>
                            </SheetClose>
                            <Button type="submit" disabled={!name.trim() || !accountId || loading}>
                                {loading ? "Salvando…" : "Salvar alterações"}
                            </Button>
                        </div>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
