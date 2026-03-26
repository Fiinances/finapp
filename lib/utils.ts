// Utilitários financeiros e de datas para parcelamentos
export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function addMonths(mmyyyy: string, n: number): string {
  const [mm, yyyy] = mmyyyy.split("/").map(Number)
  const d = new Date(yyyy, mm - 1 + n, 1)
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
}

export function lastBillingMonth(first_billing_month: string, installments: number): string {
  return addMonths(first_billing_month, installments - 1)
}
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
