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
import MonthPicker from "@/components/month-picker"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { Transaction } from "@/app/types/electron"
import { formatCurrency } from "@/lib/utils"
import { parseMaskedAmount } from "@/lib/transactions"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    accountId?: number | null
    creditCardId?: number | null
}



export function AddTransactionSheet({ open, onOpenChange, onSuccess, accountId, creditCardId }: Props) {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>()
    const [description, setDescription] = React.useState("")
    const [amountDigits, setAmountDigits] = React.useState("")
    const [type, setType] = React.useState<Transaction["type"]>("expense")
    const [category, setCategory] = React.useState<string | undefined>(undefined)
    const [billingMonth, setBillingMonth] = React.useState<string | null>(null)
    const [loading, setLoading] = React.useState(false)

    function handleOpenChange(v: boolean) {
        if (!v) {
            setDescription("")
            setAmountDigits("")
            setType("expense")
            setCategory(undefined)
            setBillingMonth(null)
        }
        onOpenChange(v)
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!selectedDate || !description) return
        const amount = parseMaskedAmount(amountDigits)
        const payload: Partial<Transaction> = {
            date: selectedDate.toISOString().split("T")[0],
            description: description.trim(),
            amount,
            type,
            category: category || undefined,
            source: "manual",
        }
        if (accountId) payload.account_id = accountId
        if (creditCardId) payload.credit_card_id = creditCardId
        if (creditCardId && billingMonth) payload.billing_month = billingMonth

        setLoading(true)
        try {
            await window.electronAPI?.db.transactions.insert(payload as Transaction)
            toast.success("Transação adicionada", { position: "top-center" })
            handleOpenChange(false)
            onSuccess?.()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao adicionar transação")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent side="right" showCloseButton>
                <SheetHeader>
                    <SheetTitle>Adicionar transação</SheetTitle>
                    <SheetDescription>Adicione uma transação manualmente.</SheetDescription>
                </SheetHeader>

                <form onSubmit={onSubmit} className="flex flex-col gap-4 p-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="tx-date">Data</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecione uma data"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="tx-desc">Descrição</Label>
                        <Input id="tx-desc" placeholder="Descrição da transação" value={description} onChange={(e) => setDescription(e.target.value)} required />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="tx-amount">Valor (R$)</Label>
                        <Input id="tx-amount" type="text" inputMode="numeric" placeholder="R$ 0,00" value={amountDigits ? formatCurrency(amountDigits) : ""} onChange={(e) => setAmountDigits(e.target.value.replace(/\D/g, ""))} />
                    </div>

                    <div className="flex gap-2 items-center">
                        <label className="text-sm">Tipo:</label>
                        <select value={type} onChange={(e) => setType(e.target.value as Transaction["type"])} className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                            <option value="expense">Saída</option>
                            <option value="income">Entrada</option>
                            <option value="investment">Investimento</option>
                            <option value="transfer">Transferência</option>
                            <option value="card_payment">Pgto. Cartão</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="tx-category">Categoria</Label>
                        <Input id="tx-category" placeholder="Categoria…" value={category ?? ""} onChange={(e) => setCategory(e.target.value || undefined)} />
                    </div>

                    {creditCardId && (
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="tx-billing">Mês da fatura (MM/AAAA)</Label>
                            <MonthPicker id="tx-billing" value={billingMonth ?? ""} onChange={(v) => setBillingMonth(v || null)} />
                        </div>
                    )}

                    <SheetFooter>
                        <div className="flex items-center justify-end gap-2">
                            <SheetClose asChild>
                                <Button variant="ghost" disabled={loading}>Cancelar</Button>
                            </SheetClose>
                            <Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Adicionar transação"}</Button>
                        </div>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
