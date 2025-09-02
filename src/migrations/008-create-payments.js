/*
# Create Payments Table

1. New Tables
  - `payments`
    - `id` (uuid, primary key)
    - `branchId` (uuid, foreign key to branches)
    - `saleId` (uuid, foreign key to sales, nullable)
    - `amount` (decimal, not null)
    - `currency` (text, not null, default USD)
    - `method` (enum: cash, mpesa_stk, mpesa_c2b, card)
    - `status` (enum: pending, completed, failed, cancelled, refunded)
    - `reference` (text, unique, not null)
    - `externalReference` (text, nullable) - M-Pesa transaction ID
    - `mpesaReceiptNumber` (text, nullable)
    - `customerPhone` (text, nullable)
    - `metadata` (jsonb, nullable)
    - `processedAt` (timestamp, nullable)
    - `failureReason` (text, nullable)
    - `createdAt` (timestamp, not null)
    - `updatedAt` (timestamp, not null)

2. Indexes
  - Index on branchId for branch-specific queries
  - Index on saleId for sale-specific queries
  - Unique index on reference
  - Index on externalReference for M-Pesa reconciliation
  - Index on status for status filtering
  - Index on createdAt for date-based queries

3. Constraints
  - Foreign key constraints to branches and sales
  - Amount must be non-negative
  - Unique reference across all payments
*/

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      saleId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'sales',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      method: {
        type: Sequelize.ENUM('cash', 'mpesa_stk', 'mpesa_c2b', 'card'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
      },
      reference: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      externalReference: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      mpesaReceiptNumber: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customerPhone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      processedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      failureReason: {
        type: Sequelize.TEXT,
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
    await queryInterface.addIndex('payments', ['branchId']);
    await queryInterface.addIndex('payments', ['saleId']);
    await queryInterface.addIndex('payments', ['reference'], { unique: true });
    await queryInterface.addIndex('payments', ['externalReference']);
    await queryInterface.addIndex('payments', ['status']);
    await queryInterface.addIndex('payments', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('payments');
  }
};