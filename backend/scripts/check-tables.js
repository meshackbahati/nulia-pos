#!/usr/bin/env node

import { sequelize } from '../models/index.js';
import { QueryTypes } from 'sequelize';

async function checkTables() {
    try {
        const tables = await sequelize.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%user%'
            ORDER BY table_name;
        `, { type: QueryTypes.SELECT });

        console.log('User-related tables:');
        tables.forEach(t => console.log(`  - ${t.table_name}`));

        // Check if legacy_users exists
        const legacyExists = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'legacy_users'
            );
        `, { type: QueryTypes.SELECT });

        console.log('\nlegacy_users exists:', legacyExists[0].exists);

        const usersExists = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'users'
            );
        `, { type: QueryTypes.SELECT });

        console.log('users exists:', usersExists[0].exists);

        if (legacyExists[0].exists) {
            const count = await sequelize.query(`SELECT COUNT(*) FROM legacy_users;`, { type: QueryTypes.SELECT });
            console.log('legacy_users row count:', count[0].count);
        }

        if (usersExists[0].exists) {
            const count = await sequelize.query(`SELECT COUNT(*) FROM users;`, { type: QueryTypes.SELECT });
            console.log('users row count:', count[0].count);
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

checkTables();
