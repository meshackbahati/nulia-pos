import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocalPath = resolve(__dirname, '..', '.env.local');
const envPath = resolve(__dirname, '..', '.env');
dotenv.config({ path: envLocalPath });
dotenv.config({ path: envPath });

const dbUrl = process.env.***REMOVED***;
if (!dbUrl) {
    console.error('***REMOVED*** not found in .env');
    process.exit(1);
}

async function run() {
    const migrationsDir = resolve(__dirname, '..', 'migrations');
    const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    if (files.length === 0) {
        console.log('No SQL migration files found');
        process.exit(0);
    }

    const client = new pg.Client({ connectionString: dbUrl });
    await client.connect();
    console.log('Connected to database');

    try {
        for (const file of files) {
            const sqlPath = resolve(migrationsDir, file);
            const sql = readFileSync(sqlPath, 'utf8');
            console.log(`Running ${file}...`);
            await client.query(sql);
            console.log(`  ✓ ${file} applied`);
        }
        console.log('All SQL migrations applied successfully');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
