#!/usr/bin/env node

import { sequelize } from '../models/index.js';

async function transformUsers() {
    const transaction = await sequelize.transaction();
    
    try {
        console.log('Starting users table transformation...');

        // Check current schema
        const columns = await sequelize.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position;
        `, { transaction });

        console.log('Current users columns:');
        columns[0].forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });

        const hasBigintId = columns[0].some(c => c.column_name === 'id' && c.data_type === 'bigint');

        if (!hasBigintId) {
            console.log('\nUsers table already has correct ID type. Skipping transformation.');
            await transaction.commit();
            return;
        }

        console.log('\nTransforming users table from bigint ID to UUID...');

        // Create new users table with correct schema
        await sequelize.query(`
            CREATE TABLE users_new (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255),
                "firstName" VARCHAR(255) NOT NULL DEFAULT 'User',
                "lastName" VARCHAR(255) NOT NULL DEFAULT '',
                role VARCHAR(255) NOT NULL DEFAULT 'salesperson',
                "branchId" UUID REFERENCES branches(id) ON DELETE SET NULL ON UPDATE CASCADE,
                "isActive" BOOLEAN DEFAULT true,
                "lastLoginAt" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
        `, { transaction });

        // Migrate data
        const userCount = await sequelize.query(`SELECT COUNT(*) FROM users;`, { transaction });
        console.log(`\nMigrating ${userCount[0][0].count} users...`);

        await sequelize.query(`
            INSERT INTO users_new (email, password, "firstName", "lastName", role, "isActive")
            SELECT 
                email,
                password_hash,
                COALESCE(SPLIT_PART(display_name, ' ', 1), 'User'),
                COALESCE(SPLIT_PART(display_name, ' ', 2), ''),
                CASE 
                    WHEN is_admin = true THEN 'admin'
                    ELSE 'salesperson'
                END,
                CASE WHEN status = 'active' THEN true ELSE false END
            FROM users;
        `, { transaction });

        // Drop old table
        await sequelize.query(`DROP TABLE users;`, { transaction });

        // Rename new table
        await sequelize.query(`ALTER TABLE users_new RENAME TO users;`, { transaction });

        // Add indexes
        await sequelize.query(`CREATE UNIQUE INDEX users_email ON users (email);`, { transaction });
        await sequelize.query(`CREATE INDEX users_branch_id ON users ("branchId");`, { transaction });
        await sequelize.query(`CREATE INDEX users_role ON users (role);`, { transaction });

        // Create enum type
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE enum_users_role AS ENUM ('admin', 'manager', 'head_of_sales', 'salesperson');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `, { transaction });

        // Alter role column to use enum
        await sequelize.query(`
            ALTER TABLE users ALTER COLUMN role TYPE enum_users_role USING role::enum_users_role;
        `, { transaction });

        await transaction.commit();
        console.log('\n✓ Users table transformed successfully!');

        // Verify
        const newColumns = await sequelize.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position;
        `);

        console.log('\nNew users columns:');
        newColumns[0].forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });

    } catch (error) {
        await transaction.rollback();
        console.error('\n✗ Error:', error.message);
        throw error;
    } finally {
        await sequelize.close();
    }
}

transformUsers();
