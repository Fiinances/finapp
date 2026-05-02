'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  FileUp,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  PiggyBank,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';

const features = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard Inteligente',
    description:
      'Visualize seu patrimônio, receitas e despesas em gráficos interativos atualizados em tempo real.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Wallet,
    title: 'Contas Bancárias',
    description:
      'Gerencie múltiplas contas em um só lugar. Acompanhe saldo, extratos e movimentações com facilidade.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: CreditCard,
    title: 'Cartões de Crédito',
    description:
      'Controle faturas, limite disponível e gastos por categoria de todos os seus cartões.',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    icon: FileUp,
    title: 'Importação OFX & CSV',
    description:
      'Importe extratos do seu banco automaticamente. Suporte completo a OFX e CSV com mapeamento de campos.',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    icon: TrendingUp,
    title: 'Análise por Categoria',
    description:
      'Entenda para onde vai seu dinheiro. Gráficos de despesas agrupadas por categoria ao longo do tempo.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  {
    icon: ShieldCheck,
    title: '100% Local & Privado',
    description:
      'Seus dados financeiros ficam apenas no seu dispositivo. Nenhum servidor externo, nenhum upload.',
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
  },
];

export default function Home() {
  return (
    <div className="min-h-full flex flex-col">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-16 overflow-hidden">

        {/* Decorative blurred orbs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-primary/8 blur-3xl"
        />

        {/* Logo badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
          <PiggyBank className="size-4 text-primary" />
          Finapp — Sua carteira inteligente
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground max-w-3xl leading-tight">
          Controle financeiro{' '}
          <span className="relative inline-block">
            <span className="relative z-10">completo</span>
            <span
              aria-hidden
              className="absolute bottom-1 left-0 w-full h-3 -z-10 opacity-30 rounded bg-primary"
            />
          </span>{' '}
          na palma da mão
        </h1>

        <p className="mt-5 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
          Acompanhe contas, cartões, receitas e despesas sem complicação.
          Tudo salvo localmente, sem nenhum dado enviado para a nuvem.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="gap-2 text-base px-6">
            <Link href="/dashboard">
              Ir para o Dashboard
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2 text-base px-6">
            <Link href="/banks">
              Minhas Contas
            </Link>
          </Button>
        </div>

        {/* Quick stats row */}
        <div className="mt-12 grid grid-cols-3 gap-6 max-w-md w-full">
          {[
            { value: 'OFX', label: 'e CSV suportados' },
            { value: '∞', label: 'contas e cartões' },
            { value: '0', label: 'dados na nuvem' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className="text-3xl font-black text-foreground">{stat.value}</span>
              <span className="mt-0.5 text-xs text-muted-foreground text-center leading-snug">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────── */}
      <div className="mx-6 border-t border-border" />

      {/* ── Features grid ────────────────────────────────────── */}
      <section className="px-6 py-12">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          Tudo que você precisa
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-md hover:border-primary/30 transition-all duration-200"
            >
              <div className={`inline-flex size-10 items-center justify-center rounded-lg ${f.bg}`}>
                <f.icon className={`size-5 ${f.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{f.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────── */}
      <section className="mt-auto px-6 pb-12 pt-4 flex flex-col items-center text-center gap-4">
        <div className="rounded-2xl border border-border bg-muted/50 px-8 py-8 max-w-lg w-full">
          <PiggyBank className="mx-auto size-10 text-primary mb-3" />
          <h2 className="text-xl font-bold text-foreground">Pronto para começar?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Adicione sua primeira conta bancária e comece a ter controle total das suas finanças.
          </p>
          <Button asChild className="mt-5 gap-2" size="lg">
            <Link href="/banks">
              Adicionar conta
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

    </div>
  );
}

