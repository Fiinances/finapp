const { ipcMain } = require('electron')
const { getKnex, migrate } = require('./database')

function registerDbHandlers() {
    migrate().catch((err) => console.error('[DB] Migration failed:', err))

    // ── Transactions ──────────────────────────────────────────────

    ipcMain.handle('db:transactions:list', async (_, filters = {}) => {
        const db = getKnex()
        let query = db('transactions').orderBy('date', 'desc')
        if (filters.type) query = query.where('type', filters.type)
        if (filters.accountId) query = query.where('account_id', filters.accountId)
        if (filters.creditCardId) query = query.where('credit_card_id', filters.creditCardId)
        if (filters.source) query = query.where('source', filters.source)
        return query
    })

    ipcMain.handle('db:transactions:insert', async (_, rows) => {
        const db = getKnex()
        const list = Array.isArray(rows) ? rows : [rows]
        // Ignora linhas com external_id duplicado (re-importação OFX)
        const ids = list.map((r) => r.external_id).filter(Boolean)
        let existing = new Set()
        if (ids.length > 0) {
            const rows = await db('transactions').whereIn('external_id', ids).select('external_id')
            existing = new Set(rows.map((r) => r.external_id))
        }
        const toInsert = list.filter((r) => !r.external_id || !existing.has(r.external_id))
        if (toInsert.length === 0) return { inserted: 0, skipped: list.length }
        await db('transactions').insert(toInsert)
        return { inserted: toInsert.length, skipped: list.length - toInsert.length }
    })

    ipcMain.handle('db:transactions:update', async (_, id, data) => {
        return getKnex()('transactions').where('id', id).update(data)
    })

    ipcMain.handle('db:transactions:delete', async (_, id) => {
        return getKnex()('transactions').where('id', id).delete()
    })

    ipcMain.handle('db:transactions:deleteByMonth', async (_, accountId, monthYear) => {
        // monthYear = 'MM/YYYY'
        // strftime matches YYYY-MM-DD (standard); SUBSTR fallback for legacy DD/MM/YYYY records
        return getKnex()('transactions')
            .where('account_id', accountId)
            .whereRaw(
                "(strftime('%m/%Y', date) = ? OR SUBSTR(date, 4, 7) = ?)",
                [monthYear, monthYear]
            )
            .delete()
    })

    // ── Accounts ──────────────────────────────────────────────────

    ipcMain.handle('db:accounts:list', async () => {
        return getKnex()('accounts').orderBy('name')
    })

    ipcMain.handle('db:accounts:insert', async (_, account) => {
        const [id] = await getKnex()('accounts').insert(account)
        return id
    })

    ipcMain.handle('db:accounts:update', async (_, id, data) => {
        return getKnex()('accounts').where('id', id).update(data)
    })

    ipcMain.handle('db:accounts:delete', async (_, id) => {
        return getKnex()('accounts').where('id', id).delete()
    })

    // ── Transaction Categories ───────────────────────────────────
    ipcMain.handle('db:transaction_categories:list', async () => {
        return getKnex()('transaction_categories').orderBy('name')
    })

    ipcMain.handle('db:transaction_categories:create', async (_, data) => {
        const [id] = await getKnex()('transaction_categories').insert(data)
        const row = await getKnex()('transaction_categories').where('id', id).first()
        return row
    })

    ipcMain.handle('db:transaction_categories:update', async (_, id, data) => {
        return getKnex()('transaction_categories').where('id', id).update(data)
    })

    ipcMain.handle('db:transaction_categories:delete', async (_, id) => {
        return getKnex()('transaction_categories').where('id', id).delete()
    })

    // ── Credit Cards ──────────────────────────────────────────────

    ipcMain.handle('db:creditCards:list', async () => {
        return getKnex()('credit_cards').orderBy('name')
    })

    ipcMain.handle('db:creditCards:insert', async (_, card) => {
        const [id] = await getKnex()('credit_cards').insert(card)
        return id
    })

    ipcMain.handle('db:creditCards:update', async (_, id, data) => {
        return getKnex()('credit_cards').where('id', id).update(data)
    })

    ipcMain.handle('db:creditCards:delete', async (_, id) => {
        return getKnex()('credit_cards').where('id', id).delete()
    })

    ipcMain.handle('db:creditCards:deleteByMonth', async (_, creditCardId, monthYear) => {
        // monthYear = 'MM/YYYY'
        // Match by explicit billing_month (new imports) or fall back to date (legacy)
        return getKnex()('transactions')
            .where('credit_card_id', creditCardId)
            .where(function () {
                this.where('billing_month', monthYear)
                    .orWhere(function () {
                        this.whereNull('billing_month')
                            .whereRaw(
                                "(strftime('%m/%Y', date) = ? OR SUBSTR(date, 4, 7) = ?)",
                                [monthYear, monthYear]
                            )
                    })
            })
            .delete()
    })

    // ── Subscriptions ─────────────────────────────────────────────

    ipcMain.handle('db:subscriptions:list', async () => {
        return getKnex()('subscriptions').orderBy('name')
    })

    ipcMain.handle('db:subscriptions:insert', async (_, data) => {
        const [id] = await getKnex()('subscriptions').insert(data)
        return id
    })

    ipcMain.handle('db:subscriptions:update', async (_, id, data) => {
        return getKnex()('subscriptions').where('id', id).update(data)
    })

    ipcMain.handle('db:subscriptions:delete', async (_, id) => {
        return getKnex()('subscriptions').where('id', id).delete()
    })

    ipcMain.handle('db:subscriptions:detect', async () => {
        return getKnex().raw(`
            SELECT
                description,
                COUNT(*)        AS occurrences,
                AVG(amount)     AS avg_amount,
                MIN(amount)     AS min_amount,
                MAX(amount)     AS max_amount,
                MIN(date)       AS first_date,
                MAX(date)       AS last_date
            FROM transactions
            WHERE type = 'expense'
            GROUP BY description
            HAVING COUNT(*) >= 3
               AND (MAX(amount) - MIN(amount)) / AVG(amount) < 0.05
            ORDER BY occurrences DESC
        `)
    })

    // ── Installment Groups ────────────────────────────────────────

    ipcMain.handle('db:installmentGroups:list', async (_, filters = {}) => {
        const db = getKnex()
        let q = db('installment_groups').orderBy('first_billing_month', 'desc')
        if (filters.creditCardId) q = q.where('credit_card_id', filters.creditCardId)
        const groups = await q
        if (groups.length === 0) return []

        // Busca transações vinculadas a cada grupo
        const ids = groups.map(g => g.id)
        const txs = await db('transactions')
            .whereIn('installment_group_id', ids)
            .select('installment_group_id', 'id', 'amount')
        const txMap = new Map()
        for (const tx of txs) {
            if (!txMap.has(tx.installment_group_id)) txMap.set(tx.installment_group_id, [])
            txMap.get(tx.installment_group_id).push(tx)
        }

        // Progresso: baseado na diferença entre o primeiro mês de parcela e o mês atual
        function parseMonthYear(str) {
            // str: 'MM/YYYY'
            if (!str) return null;
            const [mm, yyyy] = str.split('/').map(Number)
            if (!mm || !yyyy) return null;
            return { mm, yyyy }
        }
        function monthsBetween(start, end) {
            // start/end: {mm, yyyy}
            return (end.yyyy - start.yyyy) * 12 + (end.mm - start.mm)
        }
        const now = new Date()
        const current = { mm: now.getMonth() + 1, yyyy: now.getFullYear() }

        return groups.map(g => {
            const start = parseMonthYear(g.first_billing_month)
            let real_paid_installments = 0
            if (start) {
                real_paid_installments = monthsBetween(start, current) + 1 // inclui o mês inicial
            }
            const real_remaining_installments = g.installments - real_paid_installments
            const perInstallment = g.total_amount / g.installments
            const real_paid_amount = perInstallment * real_paid_installments
            const real_remaining_amount = g.total_amount - real_paid_amount
            return {
                ...g,
                real_paid_installments,
                real_remaining_installments,
                real_paid_amount,
                real_remaining_amount,
            }
        })
    })

    ipcMain.handle('db:installmentGroups:insert', async (_, data) => {
        const db = getKnex()
        const [id] = await db('installment_groups').insert(data)

        return id
    })

    ipcMain.handle('db:installmentGroups:update', async (_, id, data) => {
        return getKnex()('installment_groups').where('id', id).update(data)
    })

    ipcMain.handle('db:installmentGroups:delete', async (_, id) => {
        // unlink transactions before deleting
        await getKnex()('transactions').where('installment_group_id', id).update({ installment_group_id: null, installment_number: null })
        return getKnex()('installment_groups').where('id', id).delete()
    })

    // Scan last 2 months of card transactions for installment patterns
    ipcMain.handle('db:installmentGroups:detect', async () => {
        const db = getKnex()

        const cutoff = new Date()
        cutoff.setMonth(cutoff.getMonth() - 2)
        const cutoffStr = cutoff.toISOString().slice(0, 10)

        const rows = await db('transactions')
            .whereNotNull('credit_card_id')
            .whereNull('installment_group_id')
            .where('date', '>=', cutoffStr)
            .select('id', 'credit_card_id', 'description', 'amount', 'date', 'billing_month')

        function detectInDesc(desc) {
            const m = desc.match(/\b(\d{1,2})\s*(?:\/|-|de)\s*(\d{1,2})\b/i)
            if (!m) return null
            const current = parseInt(m[1], 10)
            const total = parseInt(m[2], 10)
            if (total < 2 || current < 1 || current > total) return null
            return { current, total, raw: m[0] }
        }

        function stripInstallmentPart(desc, raw) {
            return desc.replace(raw, '').replace(/\s{2,}/g, ' ').trim()
        }

        // group key: creditCardId::baseDescription::totalInstallments
        const groupMap = new Map()

        for (const row of rows) {
            const info = detectInDesc(row.description)
            if (!info) continue
            const base = stripInstallmentPart(row.description, info.raw)
            const key = `${row.credit_card_id}::${base}::${info.total}`
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    credit_card_id: row.credit_card_id,
                    base_description: base,
                    total_installments: info.total,
                    installment_amount: row.amount,
                    transactions: [],
                })
            }
            groupMap.get(key).transactions.push({
                id: row.id,
                installment_number: info.current,
                date: row.date,
                billing_month: row.billing_month,
            })
        }

        return Array.from(groupMap.values()).map(g => {
            const sorted = [...g.transactions].sort((a, b) => a.installment_number - b.installment_number)
            const earliest = sorted[0]

            let refMonth = earliest.billing_month
            if (!refMonth && earliest.date) {
                const d = new Date(earliest.date)
                refMonth = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
            }
            let first_billing_month = refMonth
            if (refMonth && earliest.installment_number > 1) {
                const [mm, yyyy] = refMonth.split('/').map(Number)
                const d = new Date(yyyy, mm - 1 - (earliest.installment_number - 1), 1)
                first_billing_month = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
            }

            return {
                credit_card_id: g.credit_card_id,
                base_description: g.base_description,
                total_installments: g.total_installments,
                installment_amount: g.installment_amount,
                total_amount: Math.round(g.installment_amount * g.total_installments * 100) / 100,
                first_billing_month: first_billing_month ?? '',
                occurrences: g.transactions.length,
                transactions: g.transactions.map(t => ({ id: t.id, installment_number: t.installment_number })),
            }
        })
    })
}

module.exports = { registerDbHandlers }
