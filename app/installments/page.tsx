"use client"

import React from "react"
import { toast } from "sonner"
import { Plus, Trash2, CreditCardIcon, CheckCircle2, Clock, ScanSearch, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { InstallmentGroup, CreditCard } from "@/app/types/electron"
import { DetectInstallmentsSheet } from "./components/detect-installments-sheet"

import { formatBRL, addMonths, lastBillingMonth } from "@/lib/utils"
import MonthPicker from "@/components/month-picker"

function lastBillingMonthGroup(group: InstallmentGroup): string {
    return lastBillingMonth(group.first_billing_month, group.installments)
}

const EMPTY: Omit<InstallmentGroup, "id" | "paid_installments" | "remaining_installments" | "created_at" | "updated_at"> = {
    credit_card_id: 0,
    description: "",
    total_amount: 0,
    installments: 2,
    first_billing_month: "",
    category: "",
}

export default function InstallmentsPage() {
    const [groups, setGroups] = React.useState<InstallmentGroup[]>([])
    const [cards, setCards] = React.useState<CreditCard[]>([])
    const [loading, setLoading] = React.useState(true)
    const [sheetOpen, setSheetOpen] = React.useState(false)
    const [form, setForm] = React.useState({ ...EMPTY })
    const [saving, setSaving] = React.useState(false)
    const [deletingId, setDeletingId] = React.useState<number | null>(null)
    const [detectOpen, setDetectOpen] = React.useState(false)
    const [editingId, setEditingId] = React.useState<number | null>(null)

    async function load() {
        setLoading(true)
        try {
            const [g, c] = await Promise.all([
                window.electronAPI?.db.installmentGroups.list() ?? Promise.resolve([]),
                window.electronAPI?.db.creditCards.list() ?? Promise.resolve([]),
            ])
            setGroups(g ?? [])
            setCards(c ?? [])
        } catch { /* outside electron */ }
        finally { setLoading(false) }
    }

    React.useEffect(() => { load() }, [])

    function openNew() {
        const now = new Date()
        const firstBilling = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`
        setForm({ ...EMPTY, first_billing_month: firstBilling, credit_card_id: cards[0]?.id ?? 0 })
        setEditingId(null)
        setSheetOpen(true)
    }

    function openEdit(g: InstallmentGroup) {
        setForm({
            credit_card_id: g.credit_card_id,
            description: g.description,
            total_amount: g.total_amount,
            installments: g.installments,
            first_billing_month: g.first_billing_month,
            category: g.category ?? "",
        })
        setEditingId(g.id!)
        setSheetOpen(true)
    }

    async function save() {
        if (!form.credit_card_id || !form.description.trim() || form.total_amount <= 0 || form.installments < 2) {
            toast.error("Preencha todos os campos obrigatórios")
            return
        }
        if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(form.first_billing_month)) {
            toast.error("Mês da 1ª parcela deve estar no formato MM/AAAA")
            return
        }
        setSaving(true)
        try {
            if (editingId) {
                await window.electronAPI?.db.installmentGroups.update(editingId, form)
                toast.success("Parcelamento atualizado")
            } else {
                await window.electronAPI?.db.installmentGroups.insert(form)
                toast.success("Parcelamento cadastrado")
            }
            setSheetOpen(false)
            load()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao salvar")
        } finally {
            setSaving(false)
        }
    }

    async function remove(id: number) {
        setDeletingId(id)
        try {
            await window.electronAPI?.db.installmentGroups.delete(id)
            toast.success("Parcelamento removido")
            setGroups(prev => prev.filter(g => g.id !== id))
        } catch {
            toast.error("Erro ao remover")
        } finally {
            setDeletingId(null)
        }
    }

    const cardName = (id: number) => cards.find(c => c.id === id)?.name ?? "—"

    // Summary stats
    const totalRemaining = groups.reduce((s, g) => {
        const remaining = g.real_remaining_installments ?? 0
        const perInstallment = g.total_amount / g.installments
        return s + remaining * perInstallment
    }, 0)
    const activeGroups = groups.filter(g => (g.real_remaining_installments ?? 0) > 0)

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Parcelamentos</h1>
                    <p className="text-sm text-muted-foreground">Compras parceladas no cartão de crédito</p>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDetectOpen(true)}>
                        <ScanSearch className="size-4 mr-1" />
                        Detectar
                    </Button>
                    <Button size="sm" onClick={openNew}>
                        <Plus className="size-4 mr-1" />
                        Novo parcelamento
                    </Button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card>
                    <CardHeader className="pb-1 pt-4 px-4">
                        <CardDescription>Total em aberto</CardDescription>
                        <CardTitle className="text-2xl">{formatBRL(totalRemaining)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-1 pt-4 px-4">
                        <CardDescription>Parcelamentos ativos</CardDescription>
                        <CardTitle className="text-2xl">{activeGroups.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-1 pt-4 px-4">
                        <CardDescription>Total cadastrado</CardDescription>
                        <CardTitle className="text-2xl">{groups.length}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <p className="text-sm text-muted-foreground text-center py-12">Carregando…</p>
                    ) : groups.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-12">Nenhum parcelamento cadastrado.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Cartão</TableHead>
                                    <TableHead className="text-right">Valor total</TableHead>
                                    <TableHead className="text-center">Parcelas</TableHead>
                                    <TableHead className="text-center">Progresso</TableHead>
                                    <TableHead>1ª parcela</TableHead>
                                    <TableHead>Última parcela</TableHead>
                                    <TableHead className="text-right">Restante</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groups.map(g => {
                                    const total = g.installments
                                    const paid = g.real_paid_installments ?? 0
                                    const remaining = g.real_remaining_installments ?? (total - paid)
                                    const valorPago = g.real_paid_amount ?? 0
                                    const valorRestante = g.real_remaining_amount ?? (g.total_amount - valorPago)
                                    const perInstallment = g.total_amount / total
                                    const isDone = remaining === 0
                                    return (
                                        <TableRow key={g.id} className={isDone ? "opacity-50" : undefined}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {isDone
                                                        ? <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                                                        : <Clock className="size-3.5 text-amber-500 shrink-0" />}
                                                    {g.description}
                                                    {g.category && (
                                                        <Badge variant="secondary" className="text-xs">{g.category}</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <CreditCardIcon className="size-3.5 text-muted-foreground" />
                                                    {cardName(g.credit_card_id)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{formatBRL(g.total_amount)}</TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-xs text-muted-foreground">{paid}/{total}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-violet-500 transition-all"
                                                            style={{ width: `${(paid / total) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground w-8">{Math.round((paid / total) * 100)}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{g.first_billing_month}</TableCell>
                                            <TableCell className="text-sm">{lastBillingMonthGroup(g)}</TableCell>
                                            <TableCell className="text-right font-medium text-amber-600 dark:text-amber-400">
                                                {isDone ? <span className="text-green-600 dark:text-green-400 text-xs">Quitado</span> : formatBRL(valorRestante)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-0.5">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-7 text-muted-foreground hover:text-foreground"
                                                        onClick={() => openEdit(g)}
                                                        title="Editar parcelamento"
                                                    >
                                                        <Pencil className="size-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-7 text-muted-foreground hover:text-destructive"
                                                        disabled={deletingId === g.id}
                                                        onClick={() => remove(g.id!)}
                                                        title="Remover parcelamento"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>{editingId ? "Editar parcelamento" : "Novo parcelamento"}</SheetTitle>
                        <SheetDescription>
                            {editingId ? "Altere os dados do parcelamento" : "Cadastre uma compra parcelada para acompanhar o progresso"}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="flex flex-col gap-4 py-4 px-4">
                        <div className="flex flex-col gap-1.5">
                            <Label>Cartão de crédito</Label>
                            <select
                                value={form.credit_card_id}
                                onChange={e => setForm(f => ({ ...f, credit_card_id: Number(e.target.value) }))}
                                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value={0} disabled>Selecione…</option>
                                {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Descrição</Label>
                            <Input
                                placeholder="Ex: Notebook Dell"
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label>Valor total (R$)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    placeholder="1200,00"
                                    value={form.total_amount || ""}
                                    onChange={e => setForm(f => ({ ...f, total_amount: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Nº de parcelas</Label>
                                <Input
                                    type="number"
                                    min={2}
                                    max={60}
                                    placeholder="12"
                                    value={form.installments || ""}
                                    onChange={e => setForm(f => ({ ...f, installments: parseInt(e.target.value) || 2 }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label>1ª parcela (MM/AAAA)</Label>
                                <MonthPicker
                                    value={form.first_billing_month}
                                    onChange={(v) => setForm(f => ({ ...f, first_billing_month: v }))}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Categoria</Label>
                                <Input
                                    placeholder="Opcional"
                                    value={form.category ?? ""}
                                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                />
                            </div>
                        </div>
                        {form.total_amount > 0 && form.installments >= 2 && (
                            <p className="text-xs text-muted-foreground">
                                {form.installments}x de {formatBRL(form.total_amount / form.installments)} por mês
                            </p>
                        )}
                    </div>
                    <SheetFooter className="px-4">
                        <SheetClose asChild>
                            <Button variant="ghost">Cancelar</Button>
                        </SheetClose>
                        <Button onClick={save} disabled={saving}>
                            {saving ? "Salvando…" : "Salvar"}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <DetectInstallmentsSheet
                open={detectOpen}
                onOpenChange={setDetectOpen}
                cards={cards}
                onGroupAdded={load}
            />
        </div>
    )
}
