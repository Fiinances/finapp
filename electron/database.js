
/**
 * @typedef {import('knex').Knex} Knex
 */
// @ts-check
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const knex = require('knex');

/** @type {Knex | null} */
let _knex = null;


/**
 * @returns {string}
 */
function getDbPath() {
    const dir = path.join(app.getPath('userData'), 'Database');
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'finapp.db');
}


/**
 * @returns {Knex}
 */
function getKnex() {
    console.log(getDbPath());
    if (!_knex) {
        _knex = knex({
            client: 'better-sqlite3',
            connection: { filename: getDbPath() },
            useNullAsDefault: true,
            migrations: {
                directory: path.join(__dirname, 'migrations'),
            },
        });
    }
    return _knex;
}

/**
 * @returns {Promise<void>}
 */
async function migrate() {
    const db = getKnex();
    await db.migrate.latest().then(() => console.log('Migrations applied successfully')).catch((err) => console.error('Migration error:', err));
}


module.exports = { getKnex, migrate };
