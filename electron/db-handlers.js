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
}

module.exports = { registerDbHandlers }
