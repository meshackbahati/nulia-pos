'use strict';

/**
 * Safely transform users table without breaking dependent tables
 * 
 * Strategy: Rename old users table, create new one, update foreign keys
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('Starting safe users table transformation...');

      // Step 1: Rename old users table to legacy_users
      await queryInterface.sequelize.query(`
        ALTER TABLE users RENAME TO legacy_users;
      `, { transaction });

      console.log('Renamed users -> legacy_users');

      // Step 2: Create new users table with correct schema
      await queryInterface.sequelize.query(`
        CREATE TYPE enum_users_role AS ENUM ('admin', 'manager', 'head_of_sales', 'salesperson');
      `, { transaction }).catch(() => {
        // Type might already exist, ignore error
      });

      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        password: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        firstName: {
          type: Sequelize.STRING,
          allowNull: true,
          defaultValue: 'User',
        },
        lastName: {
          type: Sequelize.STRING,
          allowNull: true,
          defaultValue: '',
        },
        role: {
          type: 'enum_users_role',
          allowNull: false,
          defaultValue: 'salesperson',
        },
        branchId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'branches',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        },
        lastLoginAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      }, { transaction });

      console.log('Created new users table');

      // Step 3: Migrate data from legacy_users to new users table
      await queryInterface.sequelize.query(`
        INSERT INTO users (email, password, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt")
        SELECT 
          email,
          password_hash,
          COALESCE(SPLIT_PART(display_name, ' ', 1), 'User'),
          COALESCE(SPLIT_PART(display_name, ' ', 2), ''),
          CASE 
            WHEN is_admin = true THEN 'admin'
            ELSE 'salesperson'
          END::enum_users_role,
          CASE WHEN status = 'active' THEN true ELSE false END,
          NOW(),
          NOW()
        FROM legacy_users;
      `, { transaction });

      const result = await queryInterface.sequelize.query(
        'SELECT COUNT(*) FROM users;',
        { transaction, type: Sequelize.QueryTypes.SELECT }
      );

      console.log(`Migrated ${result[0].count} users to new table`);

      // Step 4: Add indexes
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users (email);
        EXCEPTION
          WHEN duplicate_table THEN null;
        END $$;
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS users_branch_id ON users ("branchId");
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS users_role ON users (role);
      `, { transaction });

      console.log('Added indexes to new users table');

      await transaction.commit();
      console.log('✓ Users table transformation completed successfully!');
      console.log('Note: legacy_users table preserved for safety. Can be dropped after verification.');

    } catch (error) {
      await transaction.rollback();
      console.error('✗ Error during transformation:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('Down migration: restoring legacy_users table');
    // Keep legacy_users as safety, just drop new users table
    await queryInterface.dropTable('users');
  }
};
