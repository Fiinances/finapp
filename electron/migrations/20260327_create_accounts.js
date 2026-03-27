/**
 * Migration para criar a tabela accounts, caso não exista.
 */
/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
    const hasAccounts = await knex.schema.hasTable('accounts');
    if (!hasAccounts) {
        await knex.schema.createTable('accounts', (t) => {
            t.increments('id').primary();
            t.string('name').notNullable();
            t.string('bank');
            t.decimal('balance', 15, 2).defaultTo(0);
            t.string('color');
            t.timestamps(true, true);
        });
    }
};

exports.down = async function (knex) {
    // Não remova a tabela automaticamente
};

exports.config = { transaction: true };