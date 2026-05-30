const { Sequelize, QueryTypes } = require('sequelize');

const ***REMOVED*** = process.env.***REMOVED***;

async function checkMigrations() {
  console.log('='.repeat(60));
  console.log('MIGRATION STATUS CHECK');
  console.log('='.repeat(60));
  console.log(`***REMOVED***: ${***REMOVED***}\n`);

  const sequelize = new Sequelize(***REMOVED***, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('✓ Connected successfully!\n');

    // Get all migrations from SequelizeMeta
    const appliedMigrations = await sequelize.query(`
      SELECT name FROM "SequelizeMeta" ORDER BY name;
    `, { type: QueryTypes.SELECT });

    console.log('='.repeat(60));
    console.log('APPLIED MIGRATIONS');
    console.log('='.repeat(60));
    console.log(`Total: ${appliedMigrations.length}\n`);
    
    appliedMigrations.forEach((m, i) => {
      console.log(`${i + 1}. ${m.name}`);
    });

    // Check users table schema
    console.log('\n' + '='.repeat(60));
    console.log('USERS TABLE SCHEMA');
    console.log('='.repeat(60));

    const columns = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position;
    `, { type: QueryTypes.SELECT });

    console.log('\nColumns in users table:');
    columns.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check if migrations match files
    const fs = require('fs');
    const path = require('path');
    const migrationsDir = path.resolve('migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.cjs') || f.endsWith('.js'))
      .sort();

    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION FILES');
    console.log('='.repeat(60));
    console.log(`Total: ${migrationFiles.length}\n`);

    const appliedNames = new Set(appliedMigrations.map(m => m.name));
    
    migrationFiles.forEach(f => {
      const status = appliedNames.has(f) ? '✓ Applied' : '○ Pending';
      console.log(`${status}: ${f}`);
    });

  } catch (err) {
    console.error('\n✗ Error:', err.message);
    console.error(err.stack);
  } finally {
    await sequelize.close();
  }
}

checkMigrations();
