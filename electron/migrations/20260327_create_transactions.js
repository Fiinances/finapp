/**
 * Migration para criar a tabela transactions, caso não exista.
 */
/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
    const hasTransactions = await knex.schema.hasTable('transactions');
    if (!hasTransactions) {
        await knex.schema.createTable('transactions', (t) => {
            t.increments('id').primary();
            t.integer('account_id').references('id').inTable('accounts').onDelete('SET NULL').nullable();
            t.integer('credit_card_id').references('id').inTable('credit_cards').onDelete('SET NULL').nullable();
            t.date('date').notNullable();
            t.string('description').notNullable();
            t.decimal('amount', 15, 2).notNullable();
            t.enu('type', ['income', 'expense', 'investment', 'transfer', 'card_payment']).notNullable();
            t.string('category');
            t.enu('source', ['manual', 'csv', 'ofx']).defaultTo('manual');
            t.string('external_id');
            t.string('billing_month').nullable();
            t.integer('installment_group_id').references('id').inTable('installment_groups').onDelete('SET NULL').nullable();
            t.integer('installment_number').nullable();
            t.timestamps(true, true);
        });
    }
};

exports.down = async function (knex) {
    // Não remova a tabela automaticamente
};

exports.config = { transaction: true };