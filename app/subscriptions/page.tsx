"use client"

import React from "react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SubscriptionSheet } from "./components/subscription-sheet"
import type { Subscription, Account, CreditCard } from "@/app/types/electron"

function formatBRL(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDate(iso: string | null | undefined) {
    if (!iso) return "—"
    const [y, m, d] = iso.split("-")
    return `${d}/${m}/${y}`
}

function monthlyEquivalent(amount: number, period: Subscription["period"]): number {
    if (period === "weekly") return amount * 52 / 12
    if (period === "yearly") return amount / 12
    return amount
}

const PERIOD_LABEL: Record<string, string> = {
    weekly: "Semanal",
    monthly: "Mensal",
    yearly: "Anual",
}

export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([])
    const [accounts, setAccounts] = React.useState<Account[]>([])
    const [creditCards, setCreditCards] = React.useState<CreditCard[]>([])
    const [sheetOpen, setSheetOpen] = React.useState(false)
    const [editing, setEditing] = React.useState<Subscription | null>(null)

    async function loadAll() {
        const [subs, accs, cards] = await Promise.all([
            window.electronAPI?.db.subscriptions.list() ?? [],
            window.electronAPI?.db.accounts.list() ?? [],
            window.electronAPI?.db.creditCards.list() ?? [],
        ])
        setSubscriptions(subs)
        setAccounts(accs)
        setCreditCards(cards)
    }

    React.useEffect(() => { loadAll() }, [])

    function resolveAccountName(sub: Subscription): string {
        if (sub.credit_card_id) {
            const card = creditCards.find((c) => c.id === sub.credit_card_id)
            return card ? card.name : "—"
        }
        if (sub.account_id) {
            const acc = accounts.find((a) => a.id === sub.account_id)
            return acc ? acc.name : "—"
        }
        return "—"
    }

    async function toggleActive(sub: Subscription) {
        const newActive = sub.active === 1 ? 0 : 1
        await window.electronAPI?.db.subscriptions.update(sub.id!, { active: newActive })
        setSubscriptions((prev) =>
            prev.map((s) => (s.id === sub.id ? { ...s, active: newActive } : s))
        )
    }

    async function handleDelete(sub: Subscription) {
        if (!confirm(`Excluir "${sub.name}"?`)) return
        await window.electronAPI?.db.subscriptions.delete(sub.id!)
        toast.success("Assinatura excluída", { position: "top-center" })
        loadAll()
    }

    function openNew() {
        setEditing(null)
        setSheetOpen(true)
    }

    function openEdit(sub: Subscription) {
        setEditing(sub)
        setSheetOpen(true)
    }

    // ── Summary metrics ──────────────────────────────────────────
    const active = subscriptions.filter((s) => s.active === 1)
    const monthlyExpense = active
        .filter((s) => s.type === "expense")
        .reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.period), 0)
    const monthlyIncome = active
        .filter((s) => s.type === "income")
        .reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.period), 0)

    const today = new Date()
    const sevenDaysLater = new Date(today)
    sevenDaysLater.setDate(today.getDate() + 7)
    const dueSoon = active.filter((s) => {
        if (!s.next_due) return false
        const d = new Date(s.next_due)
        return d >= today && d <= sevenDaysLater
    }).length

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <RefreshCcw className="h-5 w-5" />
                    <h1 className="text-xl font-semibold">Assinaturas</h1>
                </div>
                <Button onClick={openNew} size="sm">
                    <Plus className="mr-1 h-4 w-4" />
                    Nova assinatura
                </Button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Card>
                    <CardHeader className="pb-1 pt-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ativas</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <p className="text-2xl font-bold">{active.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1 pt-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Despesa mensal</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <p className="text-2xl font-bold text-red-500">{formatBRL(monthlyExpense)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1 pt-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Receita mensal</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <p className="text-2xl font-bold text-green-500">{formatBRL(monthlyIncome)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1 pt-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Vencem em 7 dias</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <p className="text-2xl font-bold text-amber-500">{dueSoon}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead>Período</TableHead>
                                <TableHead>Próx. vencimento</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Conta / Cartão</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-10" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subscriptions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                                        Nenhuma assinatura encontrada. Clique em "Nova assinatura" para começar.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                subscriptions.map((sub) => (
                                    <TableRow key={sub.id} className={sub.active === 0 ? "opacity-50" : ""}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {sub.color && (
                                                    <span
                                                        className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: sub.color }}
                                                    />
                                                )}
                                                <span className="font-medium">{sub.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            <span className={sub.type === "expense" ? "text-red-500" : "text-green-500"}>
                                                {formatBRL(sub.amount)}
                                            </span>
                                            {sub.period !== "monthly" && (
                                                <div className="text-xs text-muted-foreground">
                                                    ≈ {formatBRL(monthlyEquivalent(sub.amount, sub.period))}/mês
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>{PERIOD_LABEL[sub.period]}</TableCell>
                                        <TableCell>{formatDate(sub.next_due)}</TableCell>
                                        <TableCell>
                                            {sub.category ? (
                                                <Badge variant="secondary">{sub.category}</Badge>
                                            ) : "—"}
                                        </TableCell>
                                        <TableCell>{resolveAccountName(sub)}</TableCell>
                                        <TableCell>
                                            <button
                                                onClick={() => toggleActive(sub)}
                                                className="focus:outline-none"
                                                title="Clique para alternar status"
                                            >
                                                <Badge variant={sub.active === 1 ? "default" : "outline"}>
                                                    {sub.active === 1 ? "Ativa" : "Inativa"}
                                                </Badge>
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                                        <span className="sr-only">Ações</span>
                                                        <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current">
                                                            <circle cx="8" cy="2" r="1.5" />
                                                            <circle cx="8" cy="8" r="1.5" />
                                                            <circle cx="8" cy="14" r="1.5" />
                                                        </svg>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEdit(sub)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleDelete(sub)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <SubscriptionSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                onSuccess={loadAll}
                subscription={editing}
            />
        </div>
    )
}
