"use client"

import * as React from "react"
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
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
import { InfoIcon, Trash2Icon, Wand } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import Papa from "papaparse"
import { parse as parseOfx } from "ofx-js"
import { toast } from "sonner"
import type { Account, CreditCard, Transaction } from "@/app/types/electron"

type ImportKind = "pdf" | "ofx" | "csv" | null
type ImportStep = "upload" | "preview"

function findCol(headers: string[], ...candidates: string[]): string | undefined {
    return headers.find(h =>
        candidates.some(c => h.toLowerCase().includes(c.toLowerCase()))
    )
}

function mapCsvToTransactions(rows: Record<string, unknown>[]): Transaction[] {
    const headers = Object.keys(rows[0] ?? {})
    const dateCol = findCol(headers, "data", "date", "dt")
    const descCol = findCol(headers, "descri", "historico", "title", "lancamento", "lançamento", "memo", "payee", "name")
    const amountCol = findCol(headers, "valor", "amount", "value", "montante")

    return rows.flatMap(row => {
        const rawDate = dateCol ? String(row[dateCol] ?? "") : ""
        const rawDesc = descCol ? String(row[descCol] ?? "") : ""
        const rawAmountRaw = amountCol ? row[amountCol] : 0
        const rawAmount = typeof rawAmountRaw === "number"
            ? rawAmountRaw
            : parseFloat(String(rawAmountRaw ?? "0").replace(/\./g, "").replace(",", "."))

        if (!rawDate || !rawDesc) return []

        return [{
            account_id: 0,
            date: rawDate,
            description: rawDesc,
            amount: Math.abs(rawAmount),
            type: (rawAmount >= 0 ? "income" : "expense") as "income" | "expense",
            category: "",
            source: "csv" as const,
        }]
    })
}

function parseOfxDate(raw: string): string {
    // OFX date format: YYYYMMDDHHMMSS[tz] — extract just the date part
    const m = raw.match(/^(\d{4})(\d{2})(\d{2})/)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
    return raw
}

function mapOfxToTransactions(data: Record<string, unknown>): Transaction[] {
    const ofx = (data?.OFX ?? data) as Record<string, unknown>

    // Support both bank (BANKMSGSRSV1) and credit-card (CREDITCARDMSGSRSV1) OFX files
    const bankMsgs = ofx?.BANKMSGSRSV1 as Record<string, unknown> | undefined
    const ccMsgs = ofx?.CREDITCARDMSGSRSV1 as Record<string, unknown> | undefined

    const stmtrs =
        ((bankMsgs?.STMTTRNRS as Record<string, unknown>)?.STMTRS as Record<string, unknown>) ??
        ((ccMsgs?.CCSTMTTRNRS as Record<string, unknown>)?.CCSTMTRS as Record<string, unknown>)

    if (!stmtrs) return []

    const txList = (stmtrs.BANKTRANLIST as Record<string, unknown>)?.STMTTRN
    if (!txList) return []

    const txArr: Record<string, unknown>[] = Array.isArray(txList) ? txList : [txList]

    return txArr.flatMap((t) => {
        // DTPOSTED   → date  (YYYYMMDD[HHMMSS])
        // MEMO/NAME  → description
        // TRNAMT     → amount (sign determines type)
        // TRNTYPE    → CREDIT=income, DEBIT=expense (fallback: sign of TRNAMT)
        // FITID      → external_id (used for deduplication)
        const rawDate = String(t.DTPOSTED ?? "")
        const rawAmount = parseFloat(String(t.TRNAMT ?? "0"))
        const trnType = String(t.TRNTYPE ?? "").toUpperCase()
        const desc = String(t.MEMO ?? t.NAME ?? "").trim()
        const fitid = String(t.FITID ?? "").trim()
        if (!rawDate || !desc) return []

        // CREDIT → income, DEBIT → expense; fall back to sign of TRNAMT
        const type: "income" | "expense" =
            trnType === "CREDIT" ? "income"
                : trnType === "DEBIT" ? "expense"
                    : rawAmount >= 0 ? "income" : "expense"

        return [{
            account_id: 0,
            date: parseOfxDate(rawDate),
            description: desc,
            amount: Math.abs(rawAmount),
            type,
            category: "",
            source: "ofx" as const,
            external_id: fitid || undefined,
        }]
    })
}

const CATEGORIES = [
    "Alimentação",
    "Transporte",
    "Moradia",
    "Saúde",
    "Educação",
    "Lazer",
    "Vestuário",
    "Salário",
    "Investimento",
    "Transferência",
    "Boleto",
    "Outros",
]

function parseMaskedAmount(input: string): number {
    const digits = input.replace(/\D/g, "")
    return digits ? parseInt(digits, 10) / 100 : 0
}

function formatAmount(value: number): string {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Month Picker ──────────────────────────────────────────────────────────────

function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <input
            type="text"
            inputMode="numeric"
            placeholder="MM/AAAA"
            value={value}
            maxLength={7}
            onChange={(e) => {
                let v = e.target.value.replace(/[^\d/]/g, "")
                if (v.length === 2 && !v.includes("/")) v += "/"
                onChange(v)
            }}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
    )
}

// ── Billing month inference ───────────────────────────────────────────────────

function parseTransactionDate(dateStr: string): { day: number; month: number; year: number } | null {
    // DD/MM/YYYY
    let m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return { day: parseInt(m[1], 10), month: parseInt(m[2], 10), year: parseInt(m[3], 10) }
    // YYYY-MM-DD
    m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return { day: parseInt(m[3], 10), month: parseInt(m[2], 10), year: parseInt(m[1], 10) }
    // DD-MM-YYYY
    m = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
    if (m) return { day: parseInt(m[1], 10), month: parseInt(m[2], 10), year: parseInt(m[3], 10) }
    return null
}

/**
 * Given a list of transactions and the card's closing day, determines which
 * billing month the majority of transactions belong to.
 *
 * Transactions on day <= closingDay belong to the same month's bill.
 * Transactions on day > closingDay belong to the following month's bill.
 */
function inferBillingMonth(transactions: Transaction[], closingDay: number, fallback: string): string {
    const votes = new Map<string, number>()

    for (const t of transactions) {
        const parsed = parseTransactionDate(t.date)
        if (!parsed) continue
        let { day, month, year } = parsed
        if (day > closingDay) {
            month += 1
            if (month > 12) { month = 1; year++ }
        }
        const key = `${String(month).padStart(2, "0")}/${year}`
        votes.set(key, (votes.get(key) ?? 0) + 1)
    }

    let maxVotes = 0
    let result = fallback
    for (const [key, count] of votes) {
        if (count > maxVotes) { maxVotes = count; result = key }
    }
    return result
}

interface ImportDropdownProps {
    defaultAccountId?: number
    defaultCreditCardId?: number
    onSuccess?: () => void
}

export default function ImportDropdown({ defaultAccountId, defaultCreditCardId, onSuccess }: ImportDropdownProps = {}) {
    const [open, setOpen] = React.useState(false)
    const [kind, setKind] = React.useState<ImportKind>(null)
    const [step, setStep] = React.useState<ImportStep>("upload")
    const [fileName, setFileName] = React.useState<string | null>(null)
    const [file, setFile] = React.useState<File | null>(null)
    const [loading, setLoading] = React.useState(false)
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [previewTransactions, setPreviewTransactions] = React.useState<Transaction[]>([])
    const [accounts, setAccounts] = React.useState<Account[]>([])
    const [creditCards, setCreditCards] = React.useState<CreditCard[]>([])
    const [accountId, setAccountId] = React.useState<string>("")
    const [billingMonth, setBillingMonth] = React.useState<string>("")

    async function loadAccounts() {
        try {
            const [accs, cards] = await Promise.all([
                window.electronAPI?.db.accounts.list(),
                window.electronAPI?.db.creditCards.list(),
            ])
            const accList = accs ?? []
            const cardList = cards ?? []
            setAccounts(accList)
            setCreditCards(cardList)
            setBillingMonth(currentMonthYear())
            if (defaultCreditCardId) {
                const pref = cardList.find(c => c.id === defaultCreditCardId)
                if (pref) { setAccountId(`c:${pref.id}`); return }
            }
            if (defaultAccountId) {
                const pref = accList.find(a => a.id === defaultAccountId)
                if (pref) { setAccountId(`a:${pref.id}`); return }
            }
            if (accList.length > 0) setAccountId(`a:${accList[0].id}`)
            else if (cardList.length > 0) setAccountId(`c:${cardList[0].id}`)
        } catch { /* outside electron */ }
    }

    function currentMonthYear(): string {
        const now = new Date()
        return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`
    }

    // Auto-infer billing month from transaction dates + card's closing_day
    React.useEffect(() => {
        if (!accountId.startsWith("c:") || previewTransactions.length === 0) return
        const cardId = parseInt(accountId.slice(2), 10)
        const card = creditCards.find(c => c.id === cardId)
        if (!card?.closing_day) return
        setBillingMonth(inferBillingMonth(previewTransactions, card.closing_day, currentMonthYear()))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountId, creditCards, previewTransactions.length])

    function resetSheet() {
        setStep("upload")
        setFileName(null)
        setFile(null)
        setError(null)
        setPreviewTransactions([])
        setAccountId("")
        setBillingMonth(currentMonthYear())
    }

    function openFor(k: ImportKind) {
        resetSheet()
        setKind(k)
        setOpen(true)
    }

    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0]
        setFileName(f ? f.name : null)
        setFile(f ?? null)
    }

    async function processCsv(file: File) {
        const text = await file.text()
        const result = Papa.parse<Record<string, unknown>>(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
        })
        if (result.errors.length > 0) console.warn("Papa.parse warnings", result.errors)
        if (result.data.length === 0) throw new Error("CSV vazio ou sem linhas de dados.")
        setPreviewTransactions(mapCsvToTransactions(result.data))
        await loadAccounts()
        setStep("preview")
    }

    async function processOfxWithPreview(file: File) {
        const text = await file.text()
        const parsed = await parseOfx(text)
        const txns = mapOfxToTransactions(parsed as Record<string, unknown>)
        if (txns.length === 0) throw new Error("Nenhuma transação encontrada no arquivo OFX.")
        setPreviewTransactions(txns)
        await loadAccounts()
        setStep("preview")
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!file) return

        setLoading(true)
        setError(null)
        try {
            switch (kind) {
                case "csv": await processCsv(file); break
                case "ofx": await processOfxWithPreview(file); break
                default:
                    toast.error("Tipo de arquivo não suportado no momento", { position: "top-center" })
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            setError(msg)
            toast.error("Erro ao processar arquivo", { description: msg, position: "top-center" })
        } finally {
            setLoading(false)
        }
    }

    function updateRow(index: number, field: keyof Transaction, value: unknown) {
        setPreviewTransactions(prev => {
            const next = [...prev]
            next[index] = { ...next[index], [field]: value }
            return next
        })
    }

    function removeRow(index: number) {
        setPreviewTransactions(prev => prev.filter((_, i) => i !== index))
    }

    async function autoCategories() {
        const uncategorized = previewTransactions.filter(t => !t.category)
        if (uncategorized.length === 0) {
            return toast.info("Todas as transações já possuem categoria", { position: "top-center" })
        }

        const categories = await window.electronAPI?.ai.categorize(previewTransactions)

        if (categories) {
            previewTransactions.map((transaction, index) => (transaction.category = categories[index]))
            setPreviewTransactions(_ => [...previewTransactions])
            toast.success(`${uncategorized.length} transação(ões) categorizadas`, { position: "top-center" })
        }
    }

    async function confirmImport() {
        if (!accountId) {
            toast.error("Selecione uma conta ou cartão de destino")
            return
        }
        if (previewTransactions.length === 0) {
            toast.error("Não foi possível mapear os dados do CSV. Verifique se o arquivo possui colunas de data, descrição e valor.")
            return
        }
        const [dest, rawId] = accountId.split(":")
        const destId = parseInt(rawId, 10)
        const isCreditCard = dest === "c"
        if (isCreditCard && !billingMonth.match(/^(0[1-9]|1[0-2])\/\d{4}$/)) {
            toast.error("Informe o mês da fatura no formato MM/AAAA (mês entre 01 e 12)")
            return
        }
        const transactions = previewTransactions.map(t => ({
            ...t,
            account_id: dest === "a" ? destId : null,
            credit_card_id: dest === "c" ? destId : null,
            ...(isCreditCard ? { billing_month: billingMonth } : {}),
        }))
        setSaving(true)
        try {
            const result = await window.electronAPI?.db.transactions.insert(transactions)
            toast.success(
                `${result?.inserted ?? transactions.length} transação(ões) importada(s)` +
                (result?.skipped ? ` · ${result.skipped} ignorada(s)` : ""),
                { position: "top-center" }
            )
            setOpen(false)
            resetSheet()
            onSuccess?.()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao salvar transações")
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary">Importar</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => openFor("pdf")}>Importar PDF</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openFor("ofx")}>Importar OFX</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openFor("csv")}>Importar CSV</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Sheet open={open} onOpenChange={(v) => { if (!v) resetSheet(); setOpen(v) }}>
                <SheetContent
                    side="right"
                    showCloseButton
                    className={step === "preview" ? "sm:max-w-3xl" : undefined}
                >
                    <SheetHeader>
                        <SheetTitle>
                            {kind === "pdf" && "Importar PDF"}
                            {kind === "ofx" && step === "upload" && "Importar OFX"}
                            {kind === "ofx" && step === "preview" && "Confirmar importação"}
                            {kind === "csv" && step === "upload" && "Importar CSV"}
                            {kind === "csv" && step === "preview" && "Confirmar importação"}
                        </SheetTitle>
                        <SheetDescription>
                            <span>
                                {kind === "pdf" && "Envie um arquivo PDF para processarmos."}
                                {kind === "ofx" && step === "upload" && "Selecione um arquivo OFX exportado pelo seu banco (extrato eletrônico). As transações serão mapeadas automaticamente para pré-visualização."}
                                {kind === "ofx" && step === "preview" && `${previewTransactions.length} transação(ões) encontrada(s). Edite os valores e categorias antes de salvar.`}
                                {kind === "csv" && step === "upload" && "Envie um arquivo CSV com colunas de data, descrição e valor."}
                                {kind === "csv" && step === "preview" && `${previewTransactions.length} transação(ões) mapeada(s). Edite os valores e categorias antes de salvar.`}
                            </span>
                        </SheetDescription>
                    </SheetHeader>

                    {step === "upload" ? (
                        <form onSubmit={onSubmit} className="flex flex-col gap-4 p-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Arquivo</label>
                                <Input
                                    type="file"
                                    accept={kind === "pdf" ? "application/pdf" : kind === "csv" ? ".csv,text/csv" : ".ofx,application/octet-stream"}
                                    onChange={onFileChange}
                                />
                                {fileName && (
                                    <p className="text-xs text-muted-foreground mt-1">Arquivo: {fileName}</p>
                                )}
                            </div>

                            {kind === "csv" && (
                                <Alert>
                                    <InfoIcon className="size-4" />
                                    <AlertTitle>Formato esperado do CSV</AlertTitle>
                                    <AlertDescription>
                                        <p className="text-muted-foreground">O arquivo deve ter cabeçalhos na primeira linha. Os nomes das colunas são detectados automaticamente.</p>
                                        <div className="mt-2 grid grid-cols-3 gap-2">
                                            <div className="rounded-md bg-muted/50 border px-2.5 py-2 text-xs">
                                                <p className="font-medium mb-0.5">Data</p>
                                                <p className="text-muted-foreground leading-snug">data, date, dt</p>
                                                <p className="text-muted-foreground/70 leading-snug mt-0.5">Ex: 15/01/2025</p>
                                            </div>
                                            <div className="rounded-md bg-muted/50 border px-2.5 py-2 text-xs">
                                                <p className="font-medium mb-0.5">Descrição</p>
                                                <p className="text-muted-foreground leading-snug">descri, historico, memo…</p>
                                                <p className="text-muted-foreground/70 leading-snug mt-0.5">Ex: Supermercado</p>
                                            </div>
                                            <div className="rounded-md bg-muted/50 border px-2.5 py-2 text-xs">
                                                <p className="font-medium mb-0.5">Valor</p>
                                                <p className="text-muted-foreground leading-snug">valor, amount, value…</p>
                                                <p className="text-muted-foreground/70 leading-snug mt-0.5">− saída · + entrada</p>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            Separador: <span className="font-mono bg-muted border rounded px-1">,</span> ou <span className="font-mono bg-muted border rounded px-1">;</span> — Valores negativos → <strong>Saída</strong>, positivos → <strong>Entrada</strong>.
                                        </p>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {kind === "pdf" && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Título</label>
                                        <Input type="text" placeholder="Título (opcional)" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Descrição</label>
                                        <textarea className="w-full rounded-md border border-input px-3 py-2 text-sm" rows={4} />
                                    </div>
                                </>
                            )}

                            {error && <p className="text-xs text-destructive">{error}</p>}

                            <SheetFooter>
                                <div className="flex items-center justify-end gap-2">
                                    <SheetClose asChild>
                                        <Button variant="ghost" disabled={loading}>Cancelar</Button>
                                    </SheetClose>
                                    <Button type="submit" disabled={!file || loading}>
                                        {loading ? "Processando…" : `Enviar ${kind?.toUpperCase() ?? ""}`}
                                    </Button>
                                </div>
                            </SheetFooter>
                        </form>
                    ) : (
                        <div className="flex flex-col gap-4 p-4">
                            {/* Destination selector — hidden when context already provides the target */}
                            {!defaultCreditCardId && !defaultAccountId && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium">Conta bancária de destino</label>
                                    {accounts.length === 0 && creditCards.length === 0 ? (
                                        <p className="text-sm text-destructive">
                                            Nenhuma conta cadastrada. Crie uma conta em <strong>Bancos</strong> antes de importar.
                                        </p>
                                    ) : (
                                        <select
                                            value={accountId}
                                            onChange={(e) => setAccountId(e.target.value)}
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        >
                                            {accounts.length > 0 && (
                                                <optgroup label="Contas bancárias">
                                                    {accounts.map((acc) => (
                                                        <option key={acc.id} value={`a:${acc.id}`}>
                                                            {acc.name}{acc.bank ? ` — ${acc.bank}` : ""}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {creditCards.length > 0 && (
                                                <optgroup label="Cartões de crédito">
                                                    {creditCards.map((card) => (
                                                        <option key={card.id} value={`c:${card.id}`}>
                                                            {card.name}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* Billing month — only for credit cards */}
                            {accountId.startsWith("c:") && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium">
                                        Mês da fatura <span className="text-destructive">*</span>
                                    </label>
                                    <MonthPicker value={billingMonth} onChange={setBillingMonth} />
                                </div>
                            )}

                            {/* Editable transactions table */}
                            <div className="rounded-md border overflow-auto max-h-[52vh]">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                                        <tr className="border-b">
                                            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Data</th>
                                            <th className="px-3 py-2 text-left font-medium">Descrição</th>
                                            <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Valor</th>
                                            <th className="px-3 py-2 text-center font-medium whitespace-nowrap">Tipo</th>
                                            <th className="px-3 gap-3 py-2 text-left font-medium whitespace-nowrap inline-flex items-center">Categoria
                                                <button
                                                    type="button"
                                                    title="Auto categorizar usando IA"
                                                    onClick={() => autoCategories()}
                                                    className="rounded cursor-pointer p-1 gap-2 text-muted-foreground hover:bg-green-500/10 transition-colors"
                                                >
                                                    <Wand className="size-5" />
                                                </button> </th>
                                            <th className="px-3 py-2 w-8" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewTransactions.map((t, i) => (
                                            <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                                                <td className="px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap">{t.date}</td>
                                                <td className="px-3 py-1.5 max-w-[200px] truncate text-xs" title={t.description}>{t.description}</td>
                                                <td className="px-3 py-1.5">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={formatAmount(t.amount)}
                                                        onChange={e => updateRow(i, "amount", parseMaskedAmount(e.target.value))}
                                                        className="h-7 w-28 rounded border border-input bg-transparent px-2 text-right text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                                    />
                                                </td>
                                                <td className="px-3 py-1.5 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateRow(i, "type", t.type === "income" ? "expense" : t.type === "expense" ? "investment" : "income")}
                                                        className={`rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer ${t.type === "income"
                                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                            : t.type === "investment"
                                                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                            }`}
                                                    >
                                                        {t.type === "income" ? "Entrada" : t.type === "investment" ? "Investimento" : "Saída"}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <input
                                                        list="import-category-options"
                                                        type="text"
                                                        placeholder="Categoria…"
                                                        value={t.category ?? ""}
                                                        onChange={e => updateRow(i, "category", e.target.value)}
                                                        className="h-7 w-32 rounded border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                                    />
                                                </td>
                                                <td className="px-3 py-1.5 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeRow(i)}
                                                        title="Remover transação"
                                                        className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                    >
                                                        <Trash2Icon className="size-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <datalist id="import-category-options">
                                    {CATEGORIES.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>

                            <SheetFooter>
                                <div className="flex items-center justify-between w-full gap-2">
                                    <Button variant="ghost" onClick={() => setStep("upload")}>
                                        Voltar
                                    </Button>
                                    <Button
                                        onClick={confirmImport}
                                        disabled={!accountId || (accounts.length === 0 && creditCards.length === 0) || saving}
                                    >
                                        {saving ? "Importando…" : `Importar ${previewTransactions.length} transação(ões)`}
                                    </Button>
                                </div>
                            </SheetFooter>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </>
    )
}
