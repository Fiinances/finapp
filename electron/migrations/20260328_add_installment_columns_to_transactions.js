/**
 * Migration para adicionar as colunas installment_group_id e installment_number na tabela transactions, caso não existam.
 */
/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function(knex) {
  const [{ sql }] = await knex.raw("SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'");
  if (sql && !sql.includes('installment_group_id')) {
    await knex.schema.table('transactions', (t) => {
      t.integer('installment_group_id').nullable();
      t.integer('installment_number').nullable();
    });
  }
};

exports.down = async function(knex) {
  // Não remove as colunas para evitar perda de dados
};
exports.config = { transaction: true };
