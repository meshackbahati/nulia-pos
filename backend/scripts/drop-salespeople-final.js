#!/usr/bin/env node

import { sequelize } from '../models/index.js';

async function dropSalespeople() {
    try {
        console.log('\n=== DELETING ALL SALESPERSON USERS ===\n');

        const result = await sequelize.query(`
            DELETE FROM users 
            WHERE role = 'salesperson';
        `);

        console.log(`✓ Deleted ${result[1]} salesperson users\n`);

        // Verify
        const remaining = await sequelize.query(`SELECT COUNT(*) as count FROM users;`);
        console.log(`Remaining users: ${remaining[0][0].count}`);

    } catch (error) {
        console.error('\n✗ Error:', error.message);
        if (error.original?.detail) {
            console.error('Detail:', error.original.detail);
        }
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

dropSalespeople();
