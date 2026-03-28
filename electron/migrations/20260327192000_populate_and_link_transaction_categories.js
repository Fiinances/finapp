/**
 * Migration para popular a tabela transaction_categories com valores únicos da coluna category da tabela transactions
 * e atualizar a coluna category_id em transactions.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
    // Busca valores únicos não nulos de category
    const uniqueCategories = await knex('transactions')
        .distinct('category')
        .whereNotNull('category');

    // Mapeia nome para id
    const nameToId = {};

    for (const row of uniqueCategories) {
        const name = row.category;
        if (!name) continue;
        // Insere apenas se não existir
        let cat = await knex('transaction_categories').where({ name }).first();
        if (!cat) {
            const [id] = await knex('transaction_categories').insert({ name }, ['id']);
            cat = { id: typeof id === 'object' ? id.id : id, name };
        }
        nameToId[name] = cat.id;
    }

    // Atualiza transactions.category_id para cada transação
    for (const name in nameToId) {
        await knex('transactions')
            .where('category', name)
            .update({ category_id: nameToId[name] });
    }
};

exports.down = async function (knex) {
    // Não desfaz as atualizações
};
exports.config = { transaction: true };
