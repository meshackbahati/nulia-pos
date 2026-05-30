#!/usr/bin/env node

const { Sequelize, QueryInterface } = require('sequelize');
const config = require('../config/database.cjs');

const sequelize = new Sequelize(config.development);

async function inspectDB() {
    try {
        console.log('\n=== DATABASE INSPECTION ===\n');

        // 1. Check if branches table exists
        const branchesExists = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'branches'
            );
        `, { type: Sequelize.QueryTypes.SELECT });
        
        console.log('1. Branches table exists:', branchesExists[0].exists);

        if (branchesExists[0].exists) {
            // Check branches columns
            const branchesCols = await sequelize.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'branches' 
                ORDER BY ordinal_position;
            `, { type: Sequelize.QueryTypes.SELECT });
            
            console.log('\n2. Branches columns:');
            branchesCols.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });

            // Check branches data
            const branchesCount = await sequelize.query(`
                SELECT COUNT(*) as count FROM branches;
            `, { type: Sequelize.QueryTypes.SELECT });
            
            console.log('\n3. Branches row count:', branchesCount[0].count);

            // Show branch IDs
            const branchIds = await sequelize.query(`
                SELECT id, name, currency FROM branches LIMIT 5;
            `, { type: Sequelize.QueryTypes.SELECT });
            
            console.log('\n4. Sample branches:');
            branchIds.forEach(b => {
                console.log(`   - ${b.name} (ID: ${b.id}, Currency: ${b.currency})`);
            });
        }

        // 5. Check if users table exists
        const usersExists = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `, { type: Sequelize.QueryTypes.SELECT });
        
        console.log('\n5. Users table exists:', usersExists[0].exists);

        if (usersExists[0].exists) {
            // Check users columns
            const usersCols = await sequelize.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                ORDER BY ordinal_position;
            `, { type: Sequelize.QueryTypes.SELECT });
            
            console.log('\n6. Users columns:');
            usersCols.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });

            // Check users count
            const usersCount = await sequelize.query(`
                SELECT COUNT(*) as count FROM users;
            `, { type: Sequelize.QueryTypes.SELECT });
            
            console.log('\n7. Users row count:', usersCount[0].count);
        }

        // 6. Check existing foreign keys
        const foreignKeys = await sequelize.query(`
            SELECT 
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_schema = 'public'
                AND tc.table_name IN ('users', 'products', 'sales', 'payments', 'inventory');
        `, { type: Sequelize.QueryTypes.SELECT });
        
        console.log('\n8. Foreign keys:');
        foreignKeys.forEach(fk => {
            console.log(`   - ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });

        // 7. Check existing indexes on users table
        if (usersExists[0].exists) {
            const indexes = await sequelize.query(`
                SELECT 
                    i.relname as index_name,
                    ix.indisprimary as is_primary,
                    ix.indisunique as is_unique,
                    array_agg(a.attname) as columns
                FROM pg_class t
                JOIN pg_class i ON t.oid = ix.indrelid
                JOIN pg_index ix ON t.oid = ix.indrelid AND i.oid = ix.indexrelid
                JOIN pg_attribute a ON a.attrelid = t.oid
                WHERE t.relkind = 'r' 
                    AND t.relname = 'users'
                GROUP BY i.relname, ix.indisprimary, ix.indisunique
                ORDER BY i.relname;
            `, { type: Sequelize.QueryTypes.SELECT });
            
            console.log('\n9. Users indexes:');
            indexes.forEach(idx => {
                console.log(`   - ${idx.index_name} (primary: ${idx.is_primary}, unique: ${idx.is_unique}, columns: ${idx.columns.join(', ')})`);
            });
        }

        // 8. Check SequelizeMeta
        const migrations = await sequelize.query(`
            SELECT name FROM "SequelizeMeta" ORDER BY name ASC;
        `, { type: Sequelize.QueryTypes.SELECT });
        
        console.log('\n10. Applied migrations:');
        migrations.forEach(m => {
            console.log(`   - ${m.name}`);
        });

        console.log('\n=== INSPECTION COMPLETE ===\n');

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

inspectDB();
