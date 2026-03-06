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
import { CreditCardIcon, MoreHorizontalIcon, PlusIcon, Wallet2 } from "lucide-react"
import { toast } from "sonner"
import type { Account, CreditCard } from "@/app/types/electron"
import { AddBankSheet } from "./components/add-bank-sheet"
import { EditBankSheet } from "./components/edit-bank-sheet"
import { AddCreditCardSheet } from "./components/add-credit-card-sheet"
import { EditCreditCardSheet } from "./components/edit-credit-card-sheet"

export default function Carteira() {
  const router = useRouter()
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [creditCards, setCreditCards] = React.useState<CreditCard[]>([])
  const [addAccountOpen, setAddAccountOpen] = React.useState(false)
  const [addCardOpen, setAddCardOpen] = React.useState(false)
  const [editAccount, setEditAccount] = React.useState<Account | null>(null)
  const [editCard, setEditCard] = React.useState<CreditCard | null>(null)

  async function loadAll() {
    try {
      const [accs, cards] = await Promise.all([
        window.electronAPI?.db.accounts.list() ?? [],
        window.electronAPI?.db.creditCards.list() ?? [],
      ])
      setAccounts(accs ?? [])
      setCreditCards(cards ?? [])
    } catch {
      // outside electron env
    }
  }

  async function handleDeleteAccount(account: Account) {
    if (!account.id) return
    try {
      await window.electronAPI?.db.accounts.delete(account.id)
      toast.success(`Conta "${account.name}" excluída`, { position: "top-center" })
      loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir conta")
    }
  }

  async function handleDeleteCard(card: CreditCard) {
    if (!card.id) return
    try {
      await window.electronAPI?.db.creditCards.delete(card.id)
      toast.success(`Cartão "${card.name}" excluído`, { position: "top-center" })
      loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir cartão")
    }
  }

  React.useEffect(() => {
    loadAll()
  }, [])

  const isEmpty = accounts.length === 0 && creditCards.length === 0

  return (
    <>
      <Card className="w-full mx-auto">
        <CardHeader>
          <CardTitle>Contas e Cartões</CardTitle>
          <CardDescription>
            Gerencie suas contas bancárias e cartões de crédito.
          </CardDescription>
          <CardAction>
            {!isEmpty && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <PlusIcon className="size-4" />
                    Adicionar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setAddAccountOpen(true)}>
                    <Wallet2 className="size-4 mr-2" /> Conta bancária
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setAddCardOpen(true)}>
                    <CreditCardIcon className="size-4 mr-2" /> Cartão de crédito
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardAction>
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Wallet2 />
                </EmptyMedia>
                <EmptyTitle>Nenhuma conta cadastrada</EmptyTitle>
                <EmptyDescription>
                  Adicione uma conta bancária ou cartão de crédito para começar.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="flex-row justify-center gap-2">
                <Button variant="outline" onClick={() => setAddCardOpen(true)}>
                  <CreditCardIcon className="size-4" /> Cartão de crédito
                </Button>
                <Button onClick={() => setAddAccountOpen(true)}>
                  <Wallet2 className="size-4" /> Conta bancária
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Bank accounts */}
              {accounts.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Wallet2 className="size-3.5" /> Contas bancárias
                  </h3>
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
                            <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: account.color ?? "#6366f1" }} />
                            {account.name}
                          </CardTitle>
                          {account.bank && <CardDescription>{account.bank}</CardDescription>}
                          <CardAction>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-7" onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontalIcon className="size-4" />
                                  <span className="sr-only">Opções</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onSelect={() => setEditAccount(account)}>Editar</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => handleDeleteAccount(account)}>Excluir</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </CardAction>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-semibold">
                            {(account.balance ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Credit cards */}
              {creditCards.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <CreditCardIcon className="size-3.5" /> Cartões de crédito
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {creditCards.map((card) => {
                      const linked = accounts.find(a => a.id === card.account_id)
                      return (
                        <Card
                          key={card.id}
                          className="overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
                          onClick={() => router.push(`/banks/card?id=${card.id}`)}
                        >
                          <div className="h-1.5 w-full" style={{ backgroundColor: card.color ?? "#6366f1" }} />
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                              <CreditCardIcon className="size-4 shrink-0" style={{ color: card.color ?? "#6366f1" }} />
                              {card.name}
                            </CardTitle>
                            {linked && (
                              <CardDescription className="flex items-center gap-1">
                                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: linked.color ?? "#6366f1" }} />
                                {linked.name}{linked.bank ? ` — ${linked.bank}` : ""}
                              </CardDescription>
                            )}
                            <CardAction>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-7" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontalIcon className="size-4" />
                                    <span className="sr-only">Opções</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem onSelect={() => setEditCard(card)}>Editar</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem variant="destructive" onSelect={() => handleDeleteCard(card)}>Excluir</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </CardAction>
                          </CardHeader>
                          <CardContent>
                            {card.credit_limit ? (
                              <p className="text-2xl font-semibold">
                                {card.credit_limit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">Sem limite cadastrado</p>
                            )}
                            {(card.closing_day || card.due_day) && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {card.closing_day ? `Fecha dia ${card.closing_day}` : ""}
                                {card.closing_day && card.due_day ? " · " : ""}
                                {card.due_day ? `Vence dia ${card.due_day}` : ""}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AddBankSheet
        open={addAccountOpen}
        onOpenChange={setAddAccountOpen}
        onSuccess={loadAll}
      />

      <EditBankSheet
        account={editAccount}
        open={editAccount !== null}
        onOpenChange={(open) => { if (!open) setEditAccount(null) }}
        onSuccess={loadAll}
      />

      <AddCreditCardSheet
        open={addCardOpen}
        onOpenChange={setAddCardOpen}
        onSuccess={loadAll}
      />

      <EditCreditCardSheet
        card={editCard}
        open={editCard !== null}
        onOpenChange={(open) => { if (!open) setEditCard(null) }}
        onSuccess={loadAll}
      />
    </>
  )
}
