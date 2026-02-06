/*
# Create Branches Table

1. New Tables
  - `branches`
    - `id` (uuid, primary key)
    - `name` (text, not null)
    - `address` (text, not null)
    - `phone` (text, not null)
    - `email` (text, not null)
    - `currency` (text, default KES)
    - `currencySymbol` (text, default $)
    - `timezone` (text, default UTC)
    - `mpesaConsumerKey` (encrypted text, nullable)
    - `mpesaConsumerSecret` (encrypted text, nullable)
    - `mpesaPasskey` (encrypted text, nullable)
    - `mpesaShortcode` (text, nullable)
    - `mpesaCallbackUrl` (text, nullable)
    - `isActive` (boolean, default true)
    - `metadata` (jsonb, nullable)
    - `createdAt` (timestamp, not null)
    - `updatedAt` (timestamp, not null)

2. Indexes
  - Index on name for searching
  - Index on isActive for filtering active branches

3. Features
  - Encrypted M-Pesa credentials for security
  - Flexible metadata storage for future extensions
  - Multi-currency support per branch
*/

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('branches', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'KES',
      },
      currencySymbol: {
        type: Sequelize.STRING(5),
        allowNull: false,
        defaultValue: '$',
      },
      timezone: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'UTC',
      },
      mpesaConsumerKey: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      mpesaConsumerSecret: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      mpesaPasskey: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      mpesaShortcode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      mpesaCallbackUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      metadata: {
        type: Sequelize.JSONB,
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

    // Add indexes
    await queryInterface.addIndex('branches', ['name']);
    await queryInterface.addIndex('branches', ['isActive']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('branches');
  }
};