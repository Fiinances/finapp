/**
 * Migration para criar a tabela installment_groups, caso não exista.
 */
/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
    const hasInstallmentGroups = await knex.schema.hasTable('installment_groups');
    if (!hasInstallmentGroups) {
        await knex.schema.createTable('installment_groups', (t) => {
            t.increments('id').primary();
            t.integer('credit_card_id').references('id').inTable('credit_cards').onDelete('CASCADE').notNullable();
            t.string('description').notNullable();
            t.decimal('total_amount', 15, 2).notNullable();
            t.integer('installments').notNullable();
            t.string('first_billing_month').notNullable();
            t.string('category').nullable();
            t.timestamps(true, true);
        });
    }
};

exports.down = async function (knex) {
    // Não remova a tabela automaticamente
};

exports.config = { transaction: true };