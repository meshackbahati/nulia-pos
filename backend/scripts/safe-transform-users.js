#!/usr/bin/env node

import { sequelize } from '../models/index.js';
import { QueryTypes } from 'sequelize';

async function safeTransformUsers() {
    const transaction = await sequelize.transaction();
    
    try {
        console.log('Starting safe users table transformation...\n');

        // Step 1: Rename old users table to legacy_users
        console.log('1. Renaming users -> legacy_users...');
        await sequelize.query(`ALTER TABLE users RENAME TO legacy_users;`, { transaction });

        // Step 2: Create enum type
        console.log('2. Creating enum_users_role type...');
        await sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE enum_users_role AS ENUM ('admin', 'manager', 'head_of_sales', 'salesperson');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `, { transaction }).catch(() => {});

        // Step 3: Create new users table
        console.log('3. Creating new users table with UUID schema...');
        await sequelize.query(`
            CREATE TABLE users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255),
                "firstName" VARCHAR(255) DEFAULT 'User',
                "lastName" VARCHAR(255) DEFAULT '',
                role enum_users_role NOT NULL DEFAULT 'salesperson',
                "branchId" UUID REFERENCES branches(id) ON DELETE SET NULL ON UPDATE CASCADE,
                "isActive" BOOLEAN DEFAULT true,
                "lastLoginAt" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
        `, { transaction });

        // Step 4: Migrate data
        console.log('4. Migrating user data...');
        await sequelize.query(`
            INSERT INTO users (email, password, "firstName", "lastName", role, "isActive")
            SELECT 
                email,
                password_hash,
                COALESCE(SPLIT_PART(display_name, ' ', 1), 'User'),
                COALESCE(SPLIT_PART(display_name, ' ', 2), ''),
                CASE 
                    WHEN is_admin = true THEN 'admin'
                    ELSE 'salesperson'
                END::enum_users_role,
                CASE WHEN status = 'active' THEN true ELSE false END
            FROM legacy_users;
        `, { transaction });

        const result = await sequelize.query('SELECT COUNT(*) FROM users;', { 
            transaction, 
            type: QueryTypes.SELECT 
        });

        console.log(`   Migrated ${result[0].count} users`);

        // Step 5: Add indexes
        console.log('5. Adding indexes...');
        await sequelize.query(`
            DO $$ BEGIN
                CREATE UNIQUE INDEX users_email ON users (email);
            EXCEPTION
                WHEN duplicate_table THEN null;
            END $$;
        `, { transaction }).catch(() => {});
        
        await sequelize.query(`CREATE INDEX IF NOT EXISTS users_branch_id ON users ("branchId");`, { transaction });
        await sequelize.query(`CREATE INDEX IF NOT EXISTS users_role ON users (role);`, { transaction });

        await transaction.commit();
        
        console.log('\n✓ Transformation completed successfully!');
        console.log('\nNew users table schema:');
        
        const columns = await sequelize.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position;
        `, { type: QueryTypes.SELECT });

        columns.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        console.log('\nNote: legacy_users table preserved for safety');
        console.log('You can drop it later with: DROP TABLE legacy_users CASCADE;');

    } catch (error) {
        await transaction.rollback();
        console.error('\n✗ Error:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

safeTransformUsers();
