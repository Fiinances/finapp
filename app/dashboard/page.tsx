"use client"

import ImportDropdown from "@/components/import-dropdown"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BalanceAreaChart } from "./components/BalanceAreaChart"

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Bem Vindo ao seu Assistente Financeiro</CardTitle>
          <CardDescription>
            Importe seus arquivos para começar a organizar suas finanças. Você pode importar arquivos PDF, OFX ou CSV para analisar seus gastos e receitas de forma eficiente.
          </CardDescription>
          <CardAction>
            <ImportDropdown />
          </CardAction>
        </CardHeader>
      </Card>

      <BalanceAreaChart />
    </div>
  )
}

