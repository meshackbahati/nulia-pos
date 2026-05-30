#!/usr/bin/env node

import { sequelize } from '../models/index.js';
import { QueryTypes } from 'sequelize';

async function inspectRetailProTables() {
    try {
        console.log('\n=== RETAILPRO DATABASE INSPECTION ===\n');

        const tables = await sequelize.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type LIKE '%TABLE' 
            AND table_name != 'spatial_ref_sys'
            ORDER BY table_name;
        `, { type: QueryTypes.SELECT });

        console.log('All tables in database:');
        tables.forEach(t => console.log(`  - ${t.table_name}`));

        // Check specific RetailPro tables
        const retailproTables = [
            'branches', 'users', 'products', 'product_variants', 
            'inventory', 'sales', 'sale_items', 'payments', 
            'audit_logs', 'suppliers', 'purchase_orders', 'settings'
        ];

        console.log('\nRetailPro tables status:');
        for (const table of retailproTables) {
            const exists = await sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = '${table}'
                );
            `, { type: QueryTypes.SELECT });

            let count = 0;
            if (exists[0].exists) {
                const result = await sequelize.query(`SELECT COUNT(*) FROM ${table};`, { type: QueryTypes.SELECT });
                count = result[0].count;
            }

            console.log(`  ${exists[0].exists ? '✓' : '✗'} ${table}: ${exists[0].exists ? count + ' rows' : 'missing'}`);
        }

        console.log('\n=== INSPECTION COMPLETE ===\n');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

inspectRetailProTables();
