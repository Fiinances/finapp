/**
 * Migration para popular a tabela transaction_categories com valores únicos da coluna category da tabela transactions.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  // Busca valores únicos não nulos de category
  const uniqueCategories = await knex('transactions')
    .distinct('category')
    .whereNotNull('category');

  for (const row of uniqueCategories) {
    const name = row.category;
    if (!name) continue;
    // Insere apenas se não existir
    const exists = await knex('transaction_categories').where({ name }).first();
    if (!exists) {
      await knex('transaction_categories').insert({ name });
    }
  }
};

exports.down = async function (knex) {
  // Não remove categorias inseridas automaticamente
};
exports.config = { transaction: true };
