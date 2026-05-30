import { sequelize } from '../models/index.js';
import { QueryTypes } from 'sequelize';

async function inspectSalesAndUsers() {
    try {
        console.log('=== DETAILED SCHEMA INSPECTION ===\n');

        const tables = ['users', 'sales', 'branches', 'payments', 'sale_items'];

        for (const table of tables) {
            const tableExists = await sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = '${table}'
                );
            `, { type: QueryTypes.SELECT });

            console.log(`Table "${table}" exists: ${tableExists[0].exists}`);

            if (tableExists[0].exists) {
                const cols = await sequelize.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = '${table}' 
                    ORDER BY ordinal_position;
                `, { type: QueryTypes.SELECT });
                
                console.log(`Columns for "${table}":`);
                cols.forEach(c => {
                    console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
                });

                const count = await sequelize.query(`SELECT COUNT(*) as count FROM "${table}"`, { type: QueryTypes.SELECT });
                console.log(`Row count for "${table}": ${count[0].count}\n`);
            }
        }

        console.log('=== FOREIGN KEYS ===');
        const fks = await sequelize.query(`
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
                AND tc.table_schema = 'public';
        `, { type: QueryTypes.SELECT });

        fks.forEach(fk => {
            console.log(`  - ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });

    } catch (e) {
        console.error('Error during inspection:', e);
    } finally {
        await sequelize.close();
    }
}

inspectSalesAndUsers();
