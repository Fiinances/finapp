/**
 * Migration para criar a tabela subscriptions, caso não exista.
 */
/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
    const hasSubscriptions = await knex.schema.hasTable('subscriptions');
    if (!hasSubscriptions) {
        await knex.schema.createTable('subscriptions', (t) => {
            t.increments('id').primary();
            t.string('name').notNullable();
            t.decimal('amount', 15, 2).notNullable();
            t.enu('type', ['expense', 'income']).defaultTo('expense');
            t.enu('period', ['weekly', 'monthly', 'yearly']).defaultTo('monthly');
            t.string('next_due').nullable();
            t.string('category').nullable();
            t.string('color').nullable();
            t.integer('account_id').references('id').inTable('accounts').onDelete('SET NULL').nullable();
            t.integer('credit_card_id').references('id').inTable('credit_cards').onDelete('SET NULL').nullable();
            t.integer('active').defaultTo(1);
            t.timestamps(true, true);
        });
    }
};

exports.down = async function (knex) {
    // Não remova a tabela automaticamente
};

exports.config = { transaction: true };