"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import MonthPicker from "@/components/month-picker"
import { SaveIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import type { Transaction } from "@/lib/transactions"
import { parseDateToISO, formatDate } from "@/lib/transactions"

interface TxRowProps {
    draft: Transaction
    onChange: <K extends keyof Transaction>(field: K, value: Transaction[K]) => void
    onDelete: () => void
    deleting: boolean
    categories?: string[]
    datalistId?: string
}

export function TxRow({ draft, onChange, onDelete, deleting, categories = [], datalistId = "category-options" }: TxRowProps) {
    const cellCls = "px-2 py-1.5"
    const inputCls = "h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-xs focus:border-input focus:outline-none focus:ring-1 focus:ring-ring hover:border-input/50 transition-colors"
    function formatAmount(value: number) {
        return "R$ " + value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    function parseMaskedAmount(input: string): number {
        const digits = input.replace(/\D/g, "")
        return digits ? parseInt(digits, 10) / 100 : 0
    }

    return (
        <tr className="border-b last:border-0 hover:bg-muted/20 group">
            <td className={cellCls}>
                <input type="text" value={formatDate(draft.date)} onChange={(e) => onChange("date", parseDateToISO(e.target.value) as any)} className={`${inputCls} w-[100px]`} />
            </td>
            <td className={cellCls}>
                <div className="flex items-center gap-1.5">
                    <input type="text" value={draft.description ?? ""} onChange={(e) => onChange("description", e.target.value as any)} className={`${inputCls} min-w-[160px]`} />
                    {draft.installment_number != null && (
                        <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 whitespace-nowrap">
                            {draft.installment_number}x
                        </span>
                    )}
                </div>
            </td>
            <td className={cellCls}>
                <input type="text" inputMode="decimal" value={formatAmount(draft.amount)} onChange={(e) => onChange("amount", parseMaskedAmount(e.target.value) as any)} className={`${inputCls} w-[96px] text-right`} />
            </td>
            <td className={`${cellCls} text-center`}>
                <button
                    type="button"
                    onClick={() => {
                        const types = ["income", "investment", "transfer", "card_payment", "expense"] as const
                        const idx = types.indexOf(draft.type as any)
                        const next = types[(idx + 1) % types.length]
                        onChange("type", next as any)
                    }}
                    title={draft.type === "transfer" ? "Transferências entre contas — não conta como despesa" : draft.type === "card_payment" ? "Pagamento de fatura do cartão — não conta como despesa" : undefined}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${draft.type === "income"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : draft.type === "investment"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : draft.type === "transfer"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : draft.type === "card_payment"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                >
                    {draft.type === "income" ? "Entrada" : draft.type === "investment" ? "Investimento" : draft.type === "transfer" ? "Transferência" : draft.type === "card_payment" ? "Pgto. Cartão" : "Saída"}
                </button>
            </td>
            <td className={cellCls}>
                {categories && categories.length > 0 ? (
                    <select value={draft.category ?? ""} onChange={(e) => onChange("category", (e.target.value || null) as any)} className={`${inputCls} w-[120px]`}>
                        <option value="">—</option>
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                ) : (
                    <>
                        <input list={datalistId} type="text" value={draft.category ?? ""} onChange={(e) => onChange("category", e.target.value as any)} placeholder="Categoria…" className={`${inputCls} w-[120px]`} />
                        <datalist id={datalistId}>{categories.map((c) => <option key={c} value={c} />)}</datalist>
                    </>
                )}
            </td>
            {/** billing_month is optional depending on context (cards show it, accounts hide it) */}
            {/** billing_month is shown only for credit-card transactions (credit_card_id present) */}
            {(draft as any).credit_card_id != null && (
                <td className={cellCls}>
                    <MonthPicker value={draft.billing_month ?? ""} onChange={(v) => onChange("billing_month", (v || null) as any)} className={`${inputCls} w-[90px]`} />
                </td>
            )}
            <td className={`${cellCls} text-right`}>
                <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" disabled={deleting} onClick={onDelete} title="Excluir">
                    <Trash2Icon className="size-3.5" />
                </Button>
            </td>
        </tr>
    )
}

interface MonthRowsProps {
    transactions: Transaction[]
    drafts: Record<number, Transaction>
    onDraftChange: <K extends keyof Transaction>(id: number, field: K, value: Transaction[K]) => void
    onSaved: (updatedIds?: number[], deletedId?: number) => void
    categories?: string[]
    datalistId?: string
    colSpan?: number
}
export function MonthRows({ transactions, drafts, onDraftChange, onSaved, categories = [], datalistId = "category-options", colSpan = 7 }: MonthRowsProps) {
    const [saving, setSaving] = React.useState(false)
    const [deletingId, setDeletingId] = React.useState<number | null>(null)

    const dirtyEntries = transactions.filter(t => t.id != null && JSON.stringify(drafts[t.id!]) !== JSON.stringify(t))

    async function saveAll() {
        const invalid = dirtyEntries.filter(t => {
            const bm = drafts[t.id!].billing_month
            return bm != null && bm !== "" && !/^(0[1-9]|1[0-2])\/\d{4}$/.test(bm)
        })
        if (invalid.length > 0) {
            toast.error(`Mês da fatura inválido em ${invalid.length} transação(ões). Use o formato MM/AAAA.`, { position: "top-center" })
            return
        }
        setSaving(true)
        try {
            await Promise.all(dirtyEntries.map(t =>
                window.electronAPI?.db.transactions.update(t.id!, {
                    date: parseDateToISO(drafts[t.id!].date),
                    description: drafts[t.id!].description,
                    amount: drafts[t.id!].amount,
                    type: drafts[t.id!].type,
                    category: drafts[t.id!].category,
                    billing_month: drafts[t.id!].billing_month,
                })
            ))
            toast.success(`${dirtyEntries.length} transação(ões) salva(s)`, { position: "top-center" })
            onSaved(dirtyEntries.map(t => t.id!).filter(Boolean))
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao salvar")
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id: number) {
        setDeletingId(id)
        try {
            await window.electronAPI?.db.transactions.delete(id)
            onSaved(undefined, id)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao excluir")
            setDeletingId(null)
        }
    }

    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))
    const computedShowBillingMonth = transactions.some(t => (t as any).credit_card_id != null)
    const effectiveColSpan = colSpan ?? (computedShowBillingMonth ? 7 : 6)

    return (
        <>
            {sorted.map(tx => (
                <TxRow key={tx.id} draft={drafts[tx.id!] ?? tx} onChange={(field, value) => onDraftChange(tx.id!, field, value)} onDelete={() => handleDelete(tx.id!)} deleting={deletingId === tx.id} categories={categories} datalistId={datalistId} />
            ))}
            {dirtyEntries.length > 0 && (
                <tr className="bg-primary/5 border-t">
                    <td colSpan={effectiveColSpan} className="px-3 py-2 text-right">
                        <Button size="sm" disabled={saving} onClick={saveAll}>
                            <SaveIcon className="size-3.5 mr-1.5" />
                            {saving ? "Salvando…" : `Salvar ${dirtyEntries.length} alteração(ões)`}
                        </Button>
                    </td>
                </tr>
            )}
        </>
    )
}

export default MonthRows
