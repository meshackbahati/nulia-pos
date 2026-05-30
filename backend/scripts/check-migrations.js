#!/usr/bin/env node

import models, { sequelize } from '../models/index.js';
import { QueryTypes } from 'sequelize';

async function inspectDB() {
    try {
        console.log('\n=== DATABASE INSPECTION ===\n');

        // Check SequelizeMeta
        const migrations = await sequelize.query(`
            SELECT name FROM "SequelizeMeta" ORDER BY name ASC;
        `, { type: QueryTypes.SELECT });
        
        console.log('Applied migrations:');
        migrations.forEach(m => {
            console.log(`   - ${m.name}`);
        });

        console.log('\n=== INSPECTION COMPLETE ===\n');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

inspectDB();
