/**
 * Migration para adicionar a coluna category_id em installment_groups.
 */
/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
    const hasColumn = await knex.schema.hasColumn('installment_groups', 'category_id');
    if (!hasColumn) {
        await knex.schema.alterTable('installment_groups', (t) => {
            t.integer('category_id').references('id').inTable('transaction_categories').onDelete('SET NULL').nullable();
        });
    }
};

exports.down = async function (knex) {
    // Não remove a coluna para evitar perda de dados
};
exports.config = { transaction: true };
