const { Sequelize, QueryTypes } = require('sequelize');

const ***REMOVED*** = 'postgresql://_54464d4c63dd0c15:_2b319b821e999d9629f8db3abeece3@primary.bordershop--2x9k4547yq4v.addon.code.run:27317/_086b001632c1?sslmode=require';

async function checkProductionDB() {
  console.log('='.repeat(60));
  console.log('PRODUCTION DATABASE CHECK');
  console.log('='.repeat(60));
  console.log(`URL: ${***REMOVED***}\n`);

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
    console.log('✓ Connected to PRODUCTION database successfully!\n');

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

    // Check for legacy_users table
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
      console.log('Error checking legacy_users:', err.message, '\n');
    }

    // List all tables
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

checkProductionDB();
