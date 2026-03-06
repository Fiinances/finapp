"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontalIcon, PlusIcon, Wallet2 } from "lucide-react"
import { toast } from "sonner"
import type { Account } from "@/app/types/electron"
import { AddBankSheet } from "./components/add-bank-sheet"
import { EditBankSheet } from "./components/edit-bank-sheet"

export default function Carteira() {
  const router = useRouter()
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editAccount, setEditAccount] = React.useState<Account | null>(null)

  async function loadAccounts() {
    try {
      const data = await window.electronAPI?.db.accounts.list()
      if (data) setAccounts(data)
    } catch {
      // outside electron env
    }
  }

  async function handleDelete(account: Account) {
    if (!account.id) return
    try {
      await window.electronAPI?.db.accounts.delete(account.id)
      toast.success(`Conta "${account.name}" excluída`, { position: "top-center" })
      loadAccounts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir conta")
    }
  }

  React.useEffect(() => {
    loadAccounts()
  }, [])

  return (
    <>
      <Card className="w-full mx-auto">
        <CardHeader>
          <CardTitle>Bancos</CardTitle>
          <CardDescription>
            Cadastre suas contas bancárias (Não precisa informar dados sensíveis).
          </CardDescription>
          <CardAction>
            {accounts.length != 0 ? (
              <Button size="sm" onClick={() => setSheetOpen(true)}>
                <PlusIcon className="size-4" />
                Adicionar conta
              </Button>
            ) : null}
          </CardAction>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Wallet2 />
                </EmptyMedia>
                <EmptyTitle>Nenhuma conta bancária</EmptyTitle>
                <EmptyDescription>
                  Você ainda não cadastrou nenhuma conta bancária. Comece criando
                  sua primeira conta.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="flex-row justify-center gap-2">
                <Button onClick={() => setSheetOpen(true)}>Criar conta bancária</Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => (
                <Card
                  key={account.id}
                  className="overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => router.push(`/banks/account?id=${account.id}`)}
                >
                  <div className="h-1.5 w-full" style={{ backgroundColor: account.color ?? "#6366f1" }} />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span
                        className="size-3 rounded-full shrink-0"
                        style={{ backgroundColor: account.color ?? "#6366f1" }}
                      />
                      {account.name}
                    </CardTitle>
                    {account.bank && (
                      <CardDescription>{account.bank}</CardDescription>
                    )}
                    <CardAction>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontalIcon className="size-4" />
                            <span className="sr-only">Opções</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditAccount(account)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(account)}
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {(account.balance ?? 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddBankSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={loadAccounts}
      />

      <EditBankSheet
        account={editAccount}
        open={editAccount !== null}
        onOpenChange={(open) => { if (!open) setEditAccount(null) }}
        onSuccess={loadAccounts}
      />


    </>
  )
}
