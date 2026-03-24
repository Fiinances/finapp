const path = require('path')
const fs = require('fs')
const { app } = require('electron')
const Database = require('better-sqlite3')
const knex = require('knex')

let _knex = null

function getDbPath() {
    const dir = path.join(app.getPath('userData'), 'Database')
    fs.mkdirSync(dir, { recursive: true })
    return path.join(dir, 'finapp.db')
}

function getKnex() {
    console.log(getDbPath())
    if (!_knex) {
        _knex = knex({
            client: 'better-sqlite3',
            connection: { filename: getDbPath() },
            useNullAsDefault: true,
        })
    }
    return _knex
}

async function migrate() {
    const db = getKnex()

    const hasAccounts = await db.schema.hasTable('accounts')
    if (!hasAccounts) {
        await db.schema.createTable('accounts', (t) => {
            t.increments('id').primary()
            t.string('name').notNullable()
            t.string('bank')
            t.decimal('balance', 15, 2).defaultTo(0)
            t.string('color')
            t.timestamps(true, true)
        })
    }

    const hasCreditCards = await db.schema.hasTable('credit_cards')
    if (!hasCreditCards) {
        await db.schema.createTable('credit_cards', (t) => {
            t.increments('id').primary()
            t.integer('account_id').references('id').inTable('accounts').onDelete('CASCADE').notNullable()
            t.string('name').notNullable()
            t.string('color')
            t.decimal('credit_limit', 15, 2).nullable()
            t.integer('closing_day').nullable()
            t.integer('due_day').nullable()
            t.timestamps(true, true)
        })
    }

    const hasInstallmentGroups = await db.schema.hasTable('installment_groups')
    if (!hasInstallmentGroups) {
        await db.schema.createTable('installment_groups', (t) => {
            t.increments('id').primary()
            t.integer('credit_card_id').references('id').inTable('credit_cards').onDelete('CASCADE').notNullable()
            t.string('description').notNullable()           // nome base da compra
            t.decimal('total_amount', 15, 2).notNullable()  // valor total da compra
            t.integer('installments').notNullable()         // total de parcelas
            t.string('first_billing_month').notNullable()   // MM/YYYY — mês da 1ª parcela
            t.string('category').nullable()
            t.timestamps(true, true)
        })
    }

    const hasTransactions = await db.schema.hasTable('transactions')

    if (!hasTransactions) {
        await db.schema.createTable('transactions', (t) => {
            t.increments('id').primary()
            t.integer('account_id').references('id').inTable('accounts').onDelete('SET NULL').nullable()
            t.integer('credit_card_id').references('id').inTable('credit_cards').onDelete('SET NULL').nullable()
            t.date('date').notNullable()
            t.string('description').notNullable()
            t.decimal('amount', 15, 2).notNullable()
            t.enu('type', ['income', 'expense', 'investment', 'transfer', 'card_payment']).notNullable()
            t.string('category')
            t.enu('source', ['manual', 'csv', 'ofx']).defaultTo('manual')
            t.string('external_id') // OFX FITID — evita duplicatas
            t.string('billing_month').nullable() // MM/YYYY — mes de fatura do cartao
            t.integer('installment_group_id').references('id').inTable('installment_groups').onDelete('SET NULL').nullable()
            t.integer('installment_number').nullable() // parcela atual (ex: 3)
            t.timestamps(true, true)
        })
    }

    // Migrate existing transactions table to support 'transfer' and 'card_payment' types
    if (hasTransactions) {
        const [{ sql }] = await db.raw(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'"
        )
        if (sql && !sql.includes('card_payment')) {
            await db.raw(`
                CREATE TABLE transactions_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
                    credit_card_id INTEGER REFERENCES credit_cards(id) ON DELETE SET NULL,
                    date DATE NOT NULL,
                    description VARCHAR(255) NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    type VARCHAR(255) CHECK(type IN ('income','expense','investment','transfer','card_payment')) NOT NULL,
                    category VARCHAR(255),
                    source VARCHAR(255) CHECK(source IN ('manual','csv','ofx')) DEFAULT 'manual',
                    external_id VARCHAR(255),
                    billing_month VARCHAR(255),
                    installment_group_id INTEGER REFERENCES installment_groups(id) ON DELETE SET NULL,
                    installment_number INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `)
            await db.raw('INSERT INTO transactions_new SELECT *, NULL, NULL FROM transactions')
            await db.raw('DROP TABLE transactions')
            await db.raw('ALTER TABLE transactions_new RENAME TO transactions')
        } else if (sql && !sql.includes('installment_group_id')) {
            // Already has card_payment but not installment columns
            await db.schema.table('transactions', (t) => {
                t.integer('installment_group_id').nullable()
                t.integer('installment_number').nullable()
            })
        }
    }

    const hasSubscriptions = await db.schema.hasTable('subscriptions')
    if (!hasSubscriptions) {
        await db.schema.createTable('subscriptions', (t) => {
            t.increments('id').primary()
            t.string('name').notNullable()
            t.decimal('amount', 15, 2).notNullable()
            t.enu('type', ['expense', 'income']).defaultTo('expense')
            t.enu('period', ['weekly', 'monthly', 'yearly']).defaultTo('monthly')
            t.string('next_due').nullable()         // YYYY-MM-DD
            t.string('category').nullable()
            t.string('color').nullable()
            t.integer('account_id').references('id').inTable('accounts').onDelete('SET NULL').nullable()
            t.integer('credit_card_id').references('id').inTable('credit_cards').onDelete('SET NULL').nullable()
            t.integer('active').defaultTo(1)
            t.timestamps(true, true)
        })
    }
}

module.exports = { getKnex, migrate }
