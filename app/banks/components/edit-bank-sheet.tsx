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

interface EditBankSheetProps {
    account: Account | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function EditBankSheet({ account, open, onOpenChange, onSuccess }: EditBankSheetProps) {
    const [name, setName] = React.useState("")
    const [bank, setBank] = React.useState("")
    const [balanceDigits, setBalanceDigits] = React.useState("")
    const [color, setColor] = React.useState("#6366f1")
    const [loading, setLoading] = React.useState(false)

    React.useEffect(() => {
        if (account) {
            setName(account.name)
            setBank(account.bank ?? "")
            setBalanceDigits(account.balance != null ? String(Math.round(account.balance * 100)) : "")
            setColor(account.color ?? "#6366f1")
        }
    }, [account])

    function formatCurrency(digits: string): string {
        const num = parseInt(digits || "0", 10)
        return (num / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
        })
    }

    function handleBalanceChange(e: React.ChangeEvent<HTMLInputElement>) {
        const digits = e.target.value.replace(/\D/g, "")
        setBalanceDigits(digits)
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim() || !account?.id) return

        setLoading(true)
        try {
            await window.electronAPI?.db.accounts.update(account.id, {
                name: name.trim(),
                bank: bank.trim() || undefined,
                balance: balanceDigits ? parseInt(balanceDigits, 10) / 100 : 0,
                color,
            })
            toast.success("Conta atualizada com sucesso", { position: "top-center" })
            onOpenChange(false)
            onSuccess?.()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao atualizar conta")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" showCloseButton>
                <SheetHeader>
                    <SheetTitle>Editar conta bancária</SheetTitle>
                    <SheetDescription>
                        Altere os dados da conta e salve para atualizar.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={onSubmit} className="flex flex-col gap-4 p-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit-name">Nome da conta</Label>
                        <Input
                            id="edit-name"
                            placeholder="Ex: Conta corrente, Poupança…"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit-bank">Banco</Label>
                        <Input
                            id="edit-bank"
                            placeholder="Ex: Nubank, Itaú, Bradesco…"
                            value={bank}
                            onChange={(e) => setBank(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit-color">Cor da conta</Label>
                        <div className="flex items-center gap-3">
                            <input
                                id="edit-color"
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="size-10 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                            />
                            <span className="text-sm text-muted-foreground font-mono">{color}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit-balance">Patrimônio (R$)</Label>
                        <Input
                            id="edit-balance"
                            type="text"
                            inputMode="numeric"
                            placeholder="R$ 0,00"
                            value={balanceDigits ? formatCurrency(balanceDigits) : ""}
                            onChange={handleBalanceChange}
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
                                {loading ? "Salvando…" : "Salvar alterações"}
                            </Button>
                        </div>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
