/**
 * Migration para adicionar a coluna category_id em subscriptions.
 */
/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
    const hasColumn = await knex.schema.hasColumn('subscriptions', 'category_id');
    if (!hasColumn) {
        await knex.schema.alterTable('subscriptions', (t) => {
            t.integer('category_id').references('id').inTable('transaction_categories').onDelete('SET NULL').nullable();
        });
    }
};

exports.down = async function (knex) {
    // Não remove a coluna para evitar perda de dados
};
exports.config = { transaction: true };
