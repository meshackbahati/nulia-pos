const { Sequelize, QueryTypes } = require('sequelize');
require('dotenv').config();

async function showDatabaseInfo() {
  const databaseUrl = process.env.***REMOVED***;
  
  console.log('='.repeat(60));
  console.log('DATABASE CONNECTION INFO');
  console.log('='.repeat(60));
  console.log(`***REMOVED***: ${databaseUrl}\n`);
  
  // Parse the URL to show details
  const url = new URL(databaseUrl);
  console.log('Host:', url.hostname);
  console.log('Port:', url.port);
  console.log('Database:', url.pathname.substring(1));
  console.log('Username:', url.username);
  console.log('Password:', url.password ? '***' + url.password.slice(-4) : 'none');
  console.log('SSL:', url.searchParams.get('sslmode') || 'not specified');
  
  const sequelize = new Sequelize(databaseUrl, {
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
    console.log('\n✓ Connection successful!\n');
    
    // List users from new table
    console.log('='.repeat(60));
    console.log('USERS TABLE (NEW UUID SCHEMA)');
    console.log('='.repeat(60));
    
    try {
      const newUsers = await sequelize.query(`
        SELECT id, email, "firstName", "lastName", role, "isActive", "createdAt"
        FROM users
        ORDER BY "createdAt";
      `, { type: QueryTypes.SELECT });
      
      if (newUsers.length === 0) {
        console.log('No users found in users table.\n');
      } else {
        console.log(`Found ${newUsers.length} user(s):\n`);
        newUsers.forEach((user, i) => {
          console.log(`${i + 1}. ${user.email}`);
          console.log(`   Name: ${user.firstName} ${user.lastName}`);
          console.log(`   Role: ${user.role}`);
          console.log(`   Active: ${user.isActive}`);
          console.log(`   Created: ${user.createdAt}`);
          console.log(`   ID: ${user.id}\n`);
        });
      }
    } catch (err) {
      console.log('Error reading users table:', err.message, '\n');
    }
    
    // List users from legacy table if it exists
    console.log('='.repeat(60));
    console.log('LEGACY_USERS TABLE (IF EXISTS)');
    console.log('='.repeat(60));
    
    try {
      const legacyExists = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'legacy_users'
        );
      `, { type: QueryTypes.SELECT });
      
      if (legacyExists[0].exists) {
        const legacyUsers = await sequelize.query(`
          SELECT id, email, display_name, is_admin, status, created_at
          FROM legacy_users
          ORDER BY created_at;
        `, { type: QueryTypes.SELECT });
        
        console.log(`Found ${legacyUsers.length} legacy user(s):\n`);
        legacyUsers.forEach((user, i) => {
          console.log(`${i + 1}. ${user.email}`);
          console.log(`   Name: ${user.display_name}`);
          console.log(`   Admin: ${user.is_admin}`);
          console.log(`   Status: ${user.status}`);
          console.log(`   Created: ${user.created_at}\n`);
        });
      } else {
        console.log('legacy_users table does not exist.\n');
      }
    } catch (err) {
      console.log('Error reading legacy_users table:', err.message, '\n');
    }
    
    // Show table count
    console.log('='.repeat(60));
    console.log('DATABASE TABLES');
    console.log('='.repeat(60));
    
    const tables = await sequelize.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `, { type: QueryTypes.SELECT });
    
    console.log(`Total tables: ${tables.length}`);
    console.log('Tables:', tables.map(t => t.tablename).join(', '));
    
  } catch (err) {
    console.error('\n✗ Connection failed:', err.message);
  } finally {
    await sequelize.close();
  }
}

showDatabaseInfo();
