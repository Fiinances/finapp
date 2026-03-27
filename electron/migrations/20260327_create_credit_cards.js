/**
 * Migration para criar a tabela credit_cards, caso não exista.
 */
/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
    const hasCreditCards = await knex.schema.hasTable('credit_cards');
    if (!hasCreditCards) {
        await knex.schema.createTable('credit_cards', (t) => {
            t.increments('id').primary();
            t.integer('account_id').references('id').inTable('accounts').onDelete('CASCADE').notNullable();
            t.string('name').notNullable();
            t.string('color');
            t.decimal('credit_limit', 15, 2).nullable();
            t.integer('closing_day').nullable();
            t.integer('due_day').nullable();
            t.timestamps(true, true);
        });
    }
};

exports.down = async function (knex) {
    // Não remova a tabela automaticamente
};

exports.config = { transaction: true };