#!/usr/bin/env node

import { sequelize } from '../models/index.js';
import { QueryTypes } from 'sequelize';

async function listUsers() {
    try {
        console.log('\n=== USERS IN DATABASE ===\n');

        // Check new users table
        const newUsers = await sequelize.query(`
            SELECT id, email, "firstName", "lastName", role, "isActive", "createdAt"
            FROM users
            ORDER BY "createdAt";
        `, { type: QueryTypes.SELECT });

        console.log('New users table (UUID schema):');
        console.log(`Total: ${newUsers.length} users\n`);

        newUsers.forEach((u, i) => {
            console.log(`${i + 1}. ${u.firstName} ${u.lastName}`);
            console.log(`   Email: ${u.email}`);
            console.log(`   Role: ${u.role}`);
            console.log(`   Active: ${u.isActive}`);
            console.log(`   ID: ${u.id}`);
            console.log(`   Created: ${u.createdAt}`);
            console.log('');
        });

        // Check if legacy_users still exists
        const legacyExists = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'legacy_users'
            );
        `, { type: QueryTypes.SELECT });

        if (legacyExists[0].exists) {
            console.log('\n=== LEGACY USERS TABLE (can be dropped) ===\n');
            
            const legacyUsers = await sequelize.query(`
                SELECT id, email, display_name, is_admin, status, created_at
                FROM legacy_users
                ORDER BY created_at;
            `, { type: QueryTypes.SELECT });

            console.log(`Total: ${legacyUsers.length} users\n`);

            legacyUsers.forEach((u, i) => {
                console.log(`${i + 1}. ${u.display_name || 'N/A'}`);
                console.log(`   Email: ${u.email}`);
                console.log(`   Admin: ${u.is_admin}`);
                console.log(`   Status: ${u.status}`);
                console.log(`   ID: ${u.id}`);
                console.log(`   Created: ${u.created_at}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

listUsers();
