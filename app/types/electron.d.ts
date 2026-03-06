export interface Transaction {
  id?: number
  account_id?: number | null
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category?: string
  source?: 'manual' | 'csv' | 'ofx'
  external_id?: string
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

export interface TransactionFilters {
  type?: 'income' | 'expense'
  accountId?: number
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
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
