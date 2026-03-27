/**
 * Migration para atualizar o campo type da tabela transactions, incluindo 'transfer' e 'card_payment'.
 * Replica a lógica de recriação da tabela se necessário.
 */
/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
    // Verifica se a coluna type já aceita os novos valores
    const [{ sql }] = await knex.raw("SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'");
    if (sql && !sql.includes('card_payment')) {
        // Recria a tabela conforme a lógica original
        await knex.raw('DROP TABLE IF EXISTS transactions_new');
        await knex.raw(`
      CREATE TABLE transactions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
        credit_card_id INTEGER REFERENCES credit_cards(id) ON DELETE SET NULL,
        date DATE NOT NULL,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        type VARCHAR(255) CHECK(type IN ('income','expense','investment','transfer','card_payment')) NOT NULL,
        category VARCHAR(255),
        source VARCHAR(255) CHECK(source IN ('manual','csv','ofx')) DEFAULT 'manual',
        external_id VARCHAR(255),
        billing_month VARCHAR(255),
        installment_group_id INTEGER REFERENCES installment_groups(id) ON DELETE SET NULL,
        installment_number INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await knex.raw('PRAGMA foreign_keys = OFF');
        await knex.raw(`INSERT INTO transactions_new SELECT 
      id, 
      account_id, 
      credit_card_id, 
      date, 
      description, 
      amount, 
      type, 
      category, 
      source, 
      external_id, 
      billing_month, 
      null, 
      null, 
      created_at, 
      updated_at FROM transactions`);
        await knex.raw('DROP TABLE transactions');
        await knex.raw('ALTER TABLE transactions_new RENAME TO transactions');
        await knex.raw('PRAGMA foreign_keys = ON');
    }
};

exports.down = async function (knex) {
    // Não faz downgrade para evitar perda de dados
};
exports.config = { transaction: false };
