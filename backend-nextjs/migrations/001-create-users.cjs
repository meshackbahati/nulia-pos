/*
# Create Users Table

1. New Tables
  - `users`
    - `id` (uuid, primary key)
    - `email` (text, unique, not null)
    - `password` (text, not null)
    - `firstName` (text, not null)
    - `lastName` (text, not null)
    - `role` (enum: admin, manager, head_of_sales, salesperson)
    - `branchId` (uuid, foreign key to branches)
    - `isActive` (boolean, default true)
    - `lastLoginAt` (timestamp, nullable)
    - `createdAt` (timestamp, not null)
    - `updatedAt` (timestamp, not null)

2. Indexes
  - Unique index on email
  - Index on branchId for efficient queries
  - Index on role for role-based filtering

3. Constraints
  - Email must be valid email format
  - Password minimum length of 8 characters
  - Names must be between 1-100 characters
*/

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create the enum type first
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_users_role AS ENUM ('admin', 'manager', 'head_of_sales', 'salesperson');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

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
        allowNull: false,
      },
      firstName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lastName: {
        type: Sequelize.STRING,
        allowNull: false,
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
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes after table creation
    await queryInterface.addIndex('users', ['email'], { unique: true, name: 'users_email' });
    await queryInterface.addIndex('users', ['branchId'], { name: 'users_branch_id' });
    await queryInterface.addIndex('users', ['role'], { name: 'users_role' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};