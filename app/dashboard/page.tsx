"use client"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BalanceAreaChart } from "./components/BalanceAreaChart"
import { MonthlyIncomeExpenseChart } from "./components/MonthlyIncomeExpenseChart"
import { CategoryExpenseChart } from "./components/CategoryExpenseChart"
import { CreditCardFaturaChart } from "./components/CreditCardFaturaChart"

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Bem Vindo ao seu Assistente Financeiro</CardTitle>
          <CardDescription>
            Importe seus arquivos para começar a organizar suas finanças. Você pode importar arquivos PDF, OFX ou CSV para analisar seus gastos e receitas de forma eficiente.
          </CardDescription>
        </CardHeader>
      </Card>

      <BalanceAreaChart />
      <MonthlyIncomeExpenseChart />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CategoryExpenseChart />
        <CreditCardFaturaChart />
      </div>
    </div>
  )
}

