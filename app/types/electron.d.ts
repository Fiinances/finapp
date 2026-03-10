export interface Transaction {
  id?: number
  account_id?: number | null
  credit_card_id?: number | null
  date: string
  description: string
  amount: number
  type: 'income' | 'expense' | 'investment'
  category?: string
  source?: 'manual' | 'csv' | 'ofx'
  external_id?: string
  billing_month?: string | null
  created_at?: string
  updated_at?: string
}

export interface Account {
  id?: number
  name: string
  bank?: string
  balance?: number
  color?: string
  created_at?: string
  updated_at?: string
}

export interface CreditCard {
  id?: number
  account_id: number
  name: string
  color?: string
  credit_limit?: number
  closing_day?: number
  due_day?: number
  created_at?: string
  updated_at?: string
}

export interface RecurringTransaction {
  description: string
  occurrences: number
  avg_amount: number
  min_amount: number
  max_amount: number
  first_date: string
  last_date: string
}

export interface Subscription {
  id?: number
  name: string
  amount: number
  type: 'expense' | 'income'
  period: 'weekly' | 'monthly' | 'yearly'
  next_due?: string | null
  category?: string | null
  color?: string | null
  account_id?: number | null
  credit_card_id?: number | null
  active?: number
  created_at?: string
  updated_at?: string
}

export interface TransactionFilters {
  type?: 'income' | 'expense' | 'investment'
  accountId?: number
  creditCardId?: number
  source?: 'manual' | 'csv' | 'ofx'
}

export interface InsertResult {
  inserted: number
  skipped: number
}

export interface ElectronAPI {
  platform: string
  versions: {
    node: string
    chrome: string
    electron: string
  }
  windowMinimize?: () => void
  windowMaximize?: () => void
  windowClose?: () => void
  ai: {
    categorize: (transactions: Transaction[]) => Promise<string[]>
  }
  db: {
    transactions: {
      list: (filters?: TransactionFilters) => Promise<Transaction[]>
      insert: (rows: Transaction | Transaction[]) => Promise<InsertResult>
      update: (id: number, data: Partial<Transaction>) => Promise<number>
      delete: (id: number) => Promise<number>
      deleteByMonth: (accountId: number, monthYear: string) => Promise<number>
    }
    accounts: {
      list: () => Promise<Account[]>
      insert: (account: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => Promise<number>
      update: (id: number, data: Partial<Account>) => Promise<number>
      delete: (id: number) => Promise<number>
    }
    creditCards: {
      list: () => Promise<CreditCard[]>
      insert: (card: Omit<CreditCard, 'id' | 'created_at' | 'updated_at'>) => Promise<number>
      update: (id: number, data: Partial<CreditCard>) => Promise<number>
      delete: (id: number) => Promise<number>
      deleteByMonth: (creditCardId: number, monthYear: string) => Promise<number>
    }
    subscriptions: {
      list: () => Promise<Subscription[]>
      insert: (data: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>) => Promise<number>
      update: (id: number, data: Partial<Subscription>) => Promise<number>
      delete: (id: number) => Promise<number>
      detect: () => Promise<RecurringTransaction[]>
    }
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
