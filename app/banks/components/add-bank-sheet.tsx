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
import { formatCurrency } from "@/lib/utils"

interface AddBankSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function AddBankSheet({ open, onOpenChange, onSuccess }: AddBankSheetProps) {
    const [name, setName] = React.useState("")
    const [bank, setBank] = React.useState("")
    const [balanceDigits, setBalanceDigits] = React.useState("")
    const [color, setColor] = React.useState("#6366f1")
    const [loading, setLoading] = React.useState(false)



    function handleOpenChange(value: boolean) {
        if (!value) {
            setName("")
            setBank("")
            setBalanceDigits("")
            setColor("#6366f1")
        }
        onOpenChange(value)
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        try {
            await window.electronAPI?.db.accounts.insert({
                name: name.trim(),
                bank: bank.trim() || undefined,
                balance: balanceDigits ? parseInt(balanceDigits, 10) / 100 : 0,
                color,
            })
            toast.success("Conta bancária criada com sucesso", { position: "top-center" })
            handleOpenChange(false)
            onSuccess?.()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao criar conta")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent side="right" showCloseButton>
                <SheetHeader>
                    <SheetTitle>Adicionar conta bancária</SheetTitle>
                    <SheetDescription>
                        Preencha os dados da conta. Não é necessário informar dados sensíveis.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={onSubmit} className="flex flex-col gap-4 p-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="name">Nome da conta</Label>
                        <Input
                            id="name"
                            placeholder="Ex: Conta corrente, Poupança…"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="bank">Banco / Emissor</Label>
                        <Input
                            id="bank"
                            placeholder="Ex: Nubank, Itaú, Bradesco…"
                            value={bank}
                            onChange={(e) => setBank(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="color">Cor</Label>
                        <div className="flex items-center gap-3">
                            <input
                                id="color"
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="size-10 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                            />
                            <span className="text-sm text-muted-foreground font-mono">{color}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="balance">Patrimônio inicial (R$)</Label>
                        <Input
                            id="balance"
                            type="text"
                            inputMode="numeric"
                            placeholder="R$ 0,00"
                            value={balanceDigits ? formatCurrency(balanceDigits) : ""}
                            onChange={(e) => setBalanceDigits(e.target.value.replace(/\D/g, ""))}
                        />
                    </div>

                    <SheetFooter>
                        <div className="flex items-center justify-end gap-2">
                            <SheetClose asChild>
                                <Button variant="ghost" disabled={loading}>
                                    Cancelar
                                </Button>
                            </SheetClose>
                            <Button type="submit" disabled={!name.trim() || loading}>
                                {loading ? "Salvando…" : "Salvar conta"}
                            </Button>
                        </div>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
