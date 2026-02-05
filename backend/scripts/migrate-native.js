require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg').native;

// Mock Sequelize Data Types
const Sequelize = {
    UUID: 'UUID',
    UUIDV4: 'UUIDV4',
    STRING: (length) => length ? `VARCHAR(${length})` : 'VARCHAR(255)',
    TEXT: 'TEXT',
    BOOLEAN: 'BOOLEAN',
    INTEGER: 'INTEGER',
    BIGINT: 'BIGINT',
    FLOAT: 'FLOAT',
    DATE: 'TIMESTAMP WITH TIME ZONE', // Sequelize maps DATE to TIMESTAMPTZ in Postgres
    DATEONLY: 'DATE',
    JSON: 'JSON',
    JSONB: 'JSONB',
    ENUM: (...values) => ({ type: 'ENUM', values }),
    NOW: 'NOW()',
    literal: (val) => val
};

// Functions that can also be properties
Sequelize.STRING = (length) => length ? `VARCHAR(${length})` : 'VARCHAR(255)';
Sequelize.STRING.toString = () => 'VARCHAR(255)';

Sequelize.DECIMAL = (p, s) => (p && s) ? `DECIMAL(${p},${s})` : 'DECIMAL';
Sequelize.DECIMAL.toString = () => 'DECIMAL';

Sequelize.INTEGER = () => 'INTEGER';
Sequelize.INTEGER.toString = () => 'INTEGER';


const mapType = (type) => {
    if (typeof type === 'string') return type;
    if (type && type.type === 'ENUM') return 'TEXT'; // Simplification: Use TEXT with CHECK constraint or just TEXT for enums to avoid type creation complexity
    if (typeof type === 'function') return type(); // For STRING(100)
    return 'TEXT'; // Fallback
};

const formatValue = (val) => {
    if (val === undefined || val === null) return 'NULL';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'number') return val;
    if (val === 'UUIDV4') return 'gen_random_uuid()'; // Postgres 13+
    if (val === 'NOW()') return 'NOW()';
    return `'${val.replace(/'/g, "''")}'`;
};

class MockQueryInterface {
    constructor() {
        this.sqls = [];
        this.enums = []; // Track enum types to create types
    }

    async createTable(tableName, attributes) {
        const columns = Object.entries(attributes).map(([colName, def]) => {
            let type = mapType(def.type || def);

            // Handle ENUMs specifically if needed
            if (def.type && def.type.type === 'ENUM') {
                // In a perfect world we create a type, but here let's use TEXT with CHECK constraint
                const values = def.type.values.map(v => `'${v}'`).join(', ');
                return `"${colName}" TEXT CHECK ("${colName}" IN (${values}))`;
            }

            let sql = `"${colName}" ${type}`;

            if (def.primaryKey) sql += ' PRIMARY KEY';
            if (def.allowNull === false) sql += ' NOT NULL';
            if (def.unique) sql += ' UNIQUE';

            if (def.defaultValue !== undefined) {
                // Handle Sequelize.UUIDV4 -> gen_random_uuid()
                let defaultVal = def.defaultValue;
                if (defaultVal === Sequelize.UUIDV4) defaultVal = 'UUIDV4';
                if (defaultVal === Sequelize.NOW) defaultVal = 'NOW()';

                sql += ` DEFAULT ${formatValue(defaultVal)}`;
            }

            if (def.references) {
                const refTable = def.references.model;
                const refKey = def.references.key;
                let onDelete = def.onDelete ? ` ON DELETE ${def.onDelete.toUpperCase()}` : '';
                let onUpdate = def.onUpdate ? ` ON UPDATE ${def.onUpdate.toUpperCase()}` : '';
                sql += ` REFERENCES "${refTable}" ("${refKey}")${onDelete}${onUpdate}`;
            }

            return sql;
        });

        this.sqls.push(`CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${columns.join(',\n  ')}\n);`);
    }

    async dropTable(tableName) {
        this.sqls.push(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
    }

    async addIndex(tableName, fields, options = {}) {
        const indexName = options.name || `${tableName}_${fields.join('_')}_idx`;
        const unique = options.unique ? 'UNIQUE' : '';
        const cols = fields.map(f => `"${f}"`).join(', ');
        this.sqls.push(`CREATE ${unique} INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" (${cols});`);
    }

    async addColumn(tableName, colName, def) {
        // Limited support
        let type = mapType(def.type || def);
        let sql = `ALTER TABLE "${tableName}" ADD COLUMN "${colName}" ${type}`;
        if (def.allowNull === false) sql += ' NOT NULL';
        if (def.defaultValue !== undefined) sql += ` DEFAULT ${formatValue(def.defaultValue)}`;
        if (def.references) {
            sql += ` REFERENCES "${def.references.model}" ("${def.references.key}")`;
        }
        this.sqls.push(sql + ';');
    }

    async bulkInsert(tableName, records) {
        if (!records.length) return;
        const keys = Object.keys(records[0]);
        const cols = keys.map(k => `"${k}"`).join(', ');
        const vals = records.map(r =>
            `(${keys.map(k => formatValue(r[k])).join(', ')})`
        ).join(',\n');
        this.sqls.push(`INSERT INTO "${tableName}" (${cols}) VALUES \n${vals};`);
    }
}

async function run() {
    const client = new Client({ connectionString: process.env.***REMOVED*** });
    await new Promise((resolve, reject) => client.connect(err => err ? reject(err) : resolve()));
    console.log('Connected to DB');

    try {
        // Init meta table
        await query(client, `CREATE TABLE IF NOT EXISTS "SequelizeMeta" ("name" VARCHAR(255) PRIMARY KEY NOT NULL, "date" TIMESTAMP WITH TIME ZONE DEFAULT NOW())`);

        // Ensure pgcrypto for UUID generation
        await query(client, `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

        const executedRows = await query(client, `SELECT name FROM "SequelizeMeta"`);
        const executed = new Set(executedRows.map(r => r.name));

        const migrationFiles = fs.readdirSync(path.join(__dirname, '../migrations')).sort();

        for (const file of migrationFiles) {
            if (executed.has(file)) continue;
            if (!file.endsWith('.js')) continue;

            console.log(`Migrating: ${file}`);
            const migration = require(`../migrations/${file}`);

            const qi = new MockQueryInterface();
            await migration.up(qi, Sequelize);

            // Execute collected SQLs
            await query(client, 'BEGIN');
            try {
                for (const sql of qi.sqls) {
                    console.log(`Executing SQL: ${sql.substring(0, 50)}...`);
                    await query(client, sql);
                }
                await query(client, `INSERT INTO "SequelizeMeta" ("name") VALUES ($1)`, [file]);
                await query(client, 'COMMIT');
                console.log(`Migrated: ${file}`);
            } catch (e) {
                await query(client, 'ROLLBACK');
                throw e;
            }
        }
        console.log('All migrations done.');
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        client.end();
    }
}

function query(client, sql, params = []) {
    return new Promise((resolve, reject) => {
        client.query(sql, params, (err, res) => {
            if (err) return reject(err);
            resolve(res.rows);
        });
    });
}

run();
