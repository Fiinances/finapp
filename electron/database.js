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

    const hasTransactions = await db.schema.hasTable('transactions')

    if (!hasTransactions) {
        await db.schema.createTable('transactions', (t) => {
            t.increments('id').primary()
            t.integer('account_id').references('id').inTable('accounts').onDelete('SET NULL').nullable()
            t.integer('credit_card_id').references('id').inTable('credit_cards').onDelete('SET NULL').nullable()
            t.date('date').notNullable()
            t.string('description').notNullable()
            t.decimal('amount', 15, 2).notNullable()
            t.enu('type', ['income', 'expense', 'investment']).notNullable()
            t.string('category')
            t.enu('source', ['manual', 'csv', 'ofx']).defaultTo('manual')
            t.string('external_id') // OFX FITID — evita duplicatas
            t.string('billing_month').nullable() // MM/YYYY — mes de fatura do cartao
            t.timestamps(true, true)
        })
    }
}

module.exports = { getKnex, migrate }
