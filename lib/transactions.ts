export function parseMaskedAmount(input: string): number {
    const digits = input.replace(/\D/g, "")
    return digits ? parseInt(digits, 10) / 100 : 0
}

export function formatDate(date: string): string {
    const iso = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
    const dmy = date.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
    if (dmy) return `${dmy[1].padStart(2, "0")}/${dmy[2].padStart(2, "0")}/${dmy[3]}`
    return date
}

export function parseDateToISO(date: string): string {
    const m = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
    return date
}

export function parseYearMonth(date: string): string {
    if (/^\d{4}-\d{2}/.test(date)) return date.slice(0, 7)
    const br = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (br) return `${br[3]}-${br[2]}`
    return date.slice(0, 7)
}

const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

import type { Transaction } from "@/app/types/electron"
export type { Transaction }

export interface MonthSummary {
    monthYear: string
    label: string
    count: number
    income: number
    expense: number
    investment: number
    total: number
    transactions: Transaction[]
}

export function buildSummaries(transactions: Transaction[]): MonthSummary[] {
    const map = new Map<string, MonthSummary>()
    for (const t of transactions) {
        let key: string
        let label: string
        if ((t as any).billing_month) {
            key = (t as any).billing_month
            const [mm, yyyy] = key.split("/")
            label = `${MONTH_NAMES[parseInt(mm) - 1]} ${yyyy}`
        } else {
            const ym = parseYearMonth(t.date)
            const [year, month] = ym.split("-")
            key = `${month}/${year}`
            label = `${MONTH_NAMES[parseInt(month) - 1]} ${year}`
        }
        if (!map.has(key)) {
            map.set(key, { monthYear: key, label, count: 0, income: 0, expense: 0, investment: 0, total: 0, transactions: [] })
        }
        const entry = map.get(key)!
        entry.count++
        entry.transactions.push(t)
        if (t.type === "income") entry.income += t.amount
        else if (t.type === "investment") entry.investment += t.amount
        else entry.expense += t.amount
        entry.total = entry.income - entry.expense
    }
    return Array.from(map.values()).sort((a, b) => b.monthYear.localeCompare(a.monthYear))
}

export function txBillingMonth(t: Transaction): string {
    if ((t as any).billing_month) return (t as any).billing_month
    if (/^\d{4}-\d{2}-\d{2}/.test(t.date)) return `${t.date.slice(5, 7)}/${t.date.slice(0, 4)}`
    const br = t.date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (br) return `${br[2]}/${br[3]}`
    return ""
}
