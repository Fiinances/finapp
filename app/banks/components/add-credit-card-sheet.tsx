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
import type { Account } from "@/app/types/electron"
import { formatCurrency } from "@/lib/utils"

interface AddCreditCardSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function AddCreditCardSheet({ open, onOpenChange, onSuccess }: AddCreditCardSheetProps) {
    const [accountId, setAccountId] = React.useState("")
    const [name, setName] = React.useState("")
    const [color, setColor] = React.useState("#6366f1")
    const [limitDigits, setLimitDigits] = React.useState("")
    const [closingDay, setClosingDay] = React.useState("")
    const [dueDay, setDueDay] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const [accounts, setAccounts] = React.useState<Account[]>([])

    React.useEffect(() => {
        if (open) {
            window.electronAPI?.db.accounts.list().then(data => {
                const list = data ?? []
                setAccounts(list)
                if (list.length > 0 && !accountId) setAccountId(String(list[0].id))
            }).catch(() => { })
        }
    }, [open])



    function handleOpenChange(value: boolean) {
        if (!value) {
            setAccountId("")
            setName("")
            setColor("#6366f1")
            setLimitDigits("")
            setClosingDay("")
            setDueDay("")
        }
        onOpenChange(value)
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim() || !accountId) return

        setLoading(true)
        try {
            await window.electronAPI?.db.creditCards.insert({
                account_id: parseInt(accountId, 10),
                name: name.trim(),
                color,
                credit_limit: limitDigits ? parseInt(limitDigits, 10) / 100 : undefined,
                closing_day: closingDay ? parseInt(closingDay, 10) : undefined,
                due_day: dueDay ? parseInt(dueDay, 10) : undefined,
            })
            toast.success("Cartão de crédito criado com sucesso", { position: "top-center" })
            handleOpenChange(false)
            onSuccess?.()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao criar cartão")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent side="right" showCloseButton>
                <SheetHeader>
                    <SheetTitle>Adicionar cartão de crédito</SheetTitle>
                    <SheetDescription>
                        Vincule o cartão a uma conta bancária existente.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={onSubmit} className="flex flex-col gap-4 p-4">
                    {accounts.length === 0 ? (
                        <p className="text-sm text-destructive rounded-md border border-destructive/30 p-3">
                            Nenhuma conta bancária encontrada. Crie uma conta bancária antes de adicionar um cartão.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="cc-account">
                                Conta bancária <span className="text-destructive">*</span>
                            </Label>
                            <select
                                id="cc-account"
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
                    )}

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="cc-name">Nome do cartão</Label>
                        <Input
                            id="cc-name"
                            placeholder="Ex: Nubank Platinum, C6 Gold…"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="cc-color">Cor</Label>
                        <div className="flex items-center gap-3">
                            <input
                                id="cc-color"
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="size-10 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                            />
                            <span className="text-sm text-muted-foreground font-mono">{color}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="cc-limit">Limite (R$)</Label>
                        <Input
                            id="cc-limit"
                            type="text"
                            inputMode="numeric"
                            placeholder="R$ 0,00"
                            value={limitDigits ? formatCurrency(limitDigits) : ""}
                            onChange={(e) => setLimitDigits(e.target.value.replace(/\D/g, ""))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="cc-closing">Dia de fechamento</Label>
                            <Input
                                id="cc-closing"
                                type="number"
                                min={1}
                                max={28}
                                placeholder="Ex: 10"
                                value={closingDay}
                                onChange={(e) => setClosingDay(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="cc-due">Dia de vencimento</Label>
                            <Input
                                id="cc-due"
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
                            <Button type="submit" disabled={!name.trim() || !accountId || accounts.length === 0 || loading}>
                                {loading ? "Salvando…" : "Salvar cartão"}
                            </Button>
                        </div>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
