/**
 * Migration para criar a tabela transaction_categories, caso não exista.
 */
/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  const hasCategories = await knex.schema.hasTable('transaction_categories');
  if (!hasCategories) {
    await knex.schema.createTable('transaction_categories', (t) => {
      t.increments('id').primary();
      t.string('name').notNullable();
      t.string('color').nullable();
      t.string('icon').nullable();
      t.string('type').nullable(); // income, expense, investment, etc
      t.integer('parent_id').references('id').inTable('transaction_categories').onDelete('SET NULL').nullable();
      t.timestamps(true, true);
    });
  }
};

exports.down = async function (knex) {
  // Não remova a tabela automaticamente
};
exports.config = { transaction: true };
