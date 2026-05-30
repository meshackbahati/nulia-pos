#!/usr/bin/env node

import { sequelize } from '../models/index.js';
import { QueryTypes } from 'sequelize';

async function dropSalespeople() {
    let transaction;
    
    try {
        console.log('\n=== DROPPING ALL SALESPERSON USERS ===\n');

        // First, show current users
        const currentUsers = await sequelize.query(`
            SELECT id, email, "firstName", "lastName", role, "isActive"
            FROM users
            ORDER BY "createdAt";
        `, { type: QueryTypes.SELECT });

        console.log('Current users:');
        currentUsers.forEach((u, i) => {
            console.log(`  ${i + 1}. ${u.firstName} ${u.lastName} (${u.email}) - ${u.role}`);
        });
        console.log('');

        const salespeople = currentUsers.filter(u => u.role === 'salesperson');
        console.log(`Found ${salespeople.length} salespeople to delete.\n`);

        if (salespeople.length === 0) {
            console.log('No salespeople found. Nothing to delete.');
            await sequelize.close();
            return;
        }

        // Confirm deletion
        console.log('The following users will be DELETED:');
        salespeople.forEach((u, i) => {
            console.log(`  ${i + 1}. ${u.firstName} ${u.lastName} (${u.email})`);
        });
        console.log('');

        transaction = await sequelize.transaction();

        // Delete all salespeople
        const result = await sequelize.query(`
            DELETE FROM users 
            WHERE role = 'salesperson';
        `, { transaction });

        console.log(`Deleted ${result[1]} users.\n`);

        // Show remaining users
        const remainingUsers = await sequelize.query(`
            SELECT id, email, "firstName", "lastName", role, "isActive"
            FROM users
            ORDER BY "createdAt";
        `, { type: QueryTypes.SELECT });

        console.log('Remaining users:');
        if (remainingUsers.length === 0) {
            console.log('  (none)');
        } else {
            remainingUsers.forEach((u, i) => {
                console.log(`  ${i + 1}. ${u.firstName} ${u.lastName} (${u.email}) - ${u.role}`);
            });
        }

        await transaction.commit();
        console.log('\n✓ All salespeople deleted successfully!');

    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
            console.log('\nTransaction rolled back');
        }
        console.error('\n✗ Error:', error.message);
        if (error.original) {
            console.error('Details:', error.original.message);
        }
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

dropSalespeople();
