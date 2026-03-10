"use client"

import React from "react"
import { toast } from "sonner"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { Subscription, Account, CreditCard } from "@/app/types/electron"

const PRESET_COLORS = [
    "#6366f1", "#f43f5e", "#f59e0b", "#10b981",
    "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
]

const CATEGORIES = [
    "Moradia", "Streaming", "Saúde", "Software", "Educação",
    "Academia", "Alimentação", "Transporte", "Outros",
]

interface SubscriptionSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    subscription?: Subscription | null
}

export function SubscriptionSheet({ open, onOpenChange, onSuccess, subscription }: SubscriptionSheetProps) {
    const isEditing = Boolean(subscription?.id)

    const [name, setName] = React.useState("")
    const [amountDigits, setAmountDigits] = React.useState("")
    const [type, setType] = React.useState<"expense" | "income">("expense")
    const [period, setPeriod] = React.useState<"weekly" | "monthly" | "yearly">("monthly")
    const [nextDue, setNextDue] = React.useState("")
    const [category, setCategory] = React.useState("")
    const [color, setColor] = React.useState(PRESET_COLORS[0])
    const [accountId, setAccountId] = React.useState<number | null>(null)
    const [accounts, setAccounts] = React.useState<Account[]>([])
    const [creditCards, setCreditCards] = React.useState<CreditCard[]>([])
    const [loading, setLoading] = React.useState(false)

    // destination can be "account:N" or "card:N"
    const [destination, setDestination] = React.useState("")

    function parseDestination(dest: string): { account_id: number | null; credit_card_id: number | null } {
        if (dest.startsWith("account:")) return { account_id: Number(dest.slice(8)), credit_card_id: null }
        if (dest.startsWith("card:")) return { account_id: null, credit_card_id: Number(dest.slice(5)) }
        return { account_id: null, credit_card_id: null }
    }

    function formatCurrency(digits: string): string {
        const num = parseInt(digits || "0", 10)
        return (num / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })
    }

    function handleAmountInput(e: React.ChangeEvent<HTMLInputElement>) {
        setAmountDigits(e.target.value.replace(/\D/g, ""))
    }

    React.useEffect(() => {
        if (!open) return
        window.electronAPI?.db.accounts.list().then(setAccounts)
        window.electronAPI?.db.creditCards.list().then(setCreditCards)
    }, [open])

    React.useEffect(() => {
        if (open && subscription) {
            setName(subscription.name)
            setAmountDigits(String(Math.round((subscription.amount ?? 0) * 100)))
            setType(subscription.type)
            setPeriod(subscription.period)
            setNextDue(subscription.next_due ?? "")
            setCategory(subscription.category ?? "")
            setColor(subscription.color ?? PRESET_COLORS[0])
            if (subscription.credit_card_id) {
                setDestination(`card:${subscription.credit_card_id}`)
            } else if (subscription.account_id) {
                setDestination(`account:${subscription.account_id}`)
            } else {
                setDestination("")
            }
        } else if (open && !subscription) {
            setName("")
            setAmountDigits("")
            setType("expense")
            setPeriod("monthly")
            setNextDue("")
            setCategory("")
            setColor(PRESET_COLORS[0])
            setDestination("")
        }
    }, [open, subscription])

    function handleOpenChange(value: boolean) {
        if (!value) {
            setAccountId(null)
        }
        onOpenChange(value)
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim()) return

        const amount = parseInt(amountDigits || "0", 10) / 100
        const { account_id, credit_card_id } = parseDestination(destination)

        const data: Omit<Subscription, "id" | "created_at" | "updated_at"> = {
            name: name.trim(),
            amount,
            type,
            period,
            next_due: nextDue || null,
            category: category.trim() || null,
            color,
            account_id,
            credit_card_id,
            active: 1,
        }

        setLoading(true)
        try {
            if (isEditing && subscription?.id) {
                await window.electronAPI?.db.subscriptions.update(subscription.id, data)
                toast.success("Assinatura atualizada", { position: "top-center" })
            } else {
                await window.electronAPI?.db.subscriptions.insert(data)
                toast.success("Assinatura criada", { position: "top-center" })
            }
            handleOpenChange(false)
            onSuccess?.()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao salvar assinatura")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent side="right" showCloseButton className="overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{isEditing ? "Editar assinatura" : "Nova assinatura"}</SheetTitle>
                    <SheetDescription>
                        {isEditing ? "Altere os dados da assinatura." : "Preencha os dados da nova assinatura."}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={onSubmit} className="flex flex-col gap-4 px-4 py-4">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="sub-name">Nome</Label>
                        <Input
                            id="sub-name"
                            placeholder="Netflix, Spotify…"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    {/* Amount */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="sub-amount">Valor</Label>
                        <Input
                            id="sub-amount"
                            inputMode="numeric"
                            placeholder="R$ 0,00"
                            value={amountDigits ? formatCurrency(amountDigits) : ""}
                            onChange={handleAmountInput}
                        />
                    </div>

                    {/* Type */}
                    <div className="flex flex-col gap-1.5">
                        <Label>Tipo</Label>
                        <div className="flex gap-2">
                            {(["expense", "income"] as const).map((t) => (
                                <Button
                                    key={t}
                                    type="button"
                                    variant={type === t ? "default" : "outline"}
                                    className="flex-1"
                                    onClick={() => setType(t)}
                                >
                                    {t === "expense" ? "Despesa" : "Receita"}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Period */}
                    <div className="flex flex-col gap-1.5">
                        <Label>Período</Label>
                        <div className="flex gap-2">
                            {(["weekly", "monthly", "yearly"] as const).map((p) => (
                                <Button
                                    key={p}
                                    type="button"
                                    variant={period === p ? "default" : "outline"}
                                    className="flex-1"
                                    onClick={() => setPeriod(p)}
                                >
                                    {p === "weekly" ? "Semanal" : p === "monthly" ? "Mensal" : "Anual"}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Next due */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="sub-due">Próximo vencimento</Label>
                        <Input
                            id="sub-due"
                            type="date"
                            value={nextDue}
                            onChange={(e) => setNextDue(e.target.value)}
                        />
                    </div>

                    {/* Category */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="sub-category">Categoria</Label>
                        <Input
                            id="sub-category"
                            list="sub-category-list"
                            placeholder="Ex: Streaming"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        />
                        <datalist id="sub-category-list">
                            {CATEGORIES.map((c) => <option key={c} value={c} />)}
                        </datalist>
                    </div>

                    {/* Destination account/card */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="sub-dest">Conta / Cartão</Label>
                        <select
                            id="sub-dest"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">— Nenhuma —</option>
                            {accounts.length > 0 && (
                                <optgroup label="Contas bancárias">
                                    {accounts.map((a) => (
                                        <option key={`account:${a.id}`} value={`account:${a.id}`}>{a.name}</option>
                                    ))}
                                </optgroup>
                            )}
                            {creditCards.length > 0 && (
                                <optgroup label="Cartões de crédito">
                                    {creditCards.map((c) => (
                                        <option key={`card:${c.id}`} value={`card:${c.id}`}>{c.name}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    {/* Color */}
                    <div className="flex flex-col gap-1.5">
                        <Label>Cor</Label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className="h-7 w-7 rounded-full border-2 transition-all"
                                    style={{
                                        backgroundColor: c,
                                        borderColor: color === c ? "white" : "transparent",
                                        outline: color === c ? `2px solid ${c}` : "none",
                                    }}
                                />
                            ))}
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="h-7 w-7 cursor-pointer rounded-full border-0 p-0"
                                title="Escolher cor personalizada"
                            />
                        </div>
                    </div>

                    <SheetFooter className="pt-2">
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar assinatura"}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
