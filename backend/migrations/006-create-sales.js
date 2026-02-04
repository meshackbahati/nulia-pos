/*
# Create Sales Table

1. New Tables
  - `sales`
    - `id` (uuid, primary key)
    - `branchId` (uuid, foreign key to branches)
    - `userId` (uuid, foreign key to users)
    - `receiptId` (text, unique, not null)
    - `subtotal` (decimal, not null)
    - `taxAmount` (decimal, not null, default 0)
    - `discountAmount` (decimal, not null, default 0)
    - `totalAmount` (decimal, not null)
    - `paymentMethod` (enum: cash, mpesa, card)
    - `paymentStatus` (enum: pending, completed, failed, refunded)
    - `customerPhone` (text, nullable)
    - `customerEmail` (text, nullable)
    - `notes` (text, nullable)
    - `voidedAt` (timestamp, nullable)
    - `voidedBy` (uuid, foreign key to users, nullable)
    - `voidReason` (text, nullable)
    - `metadata` (jsonb, nullable)
    - `createdAt` (timestamp, not null)
    - `updatedAt` (timestamp, not null)

2. Indexes
  - Index on branchId for branch-specific queries
  - Index on userId for user-specific queries
  - Unique index on receiptId
  - Index on paymentStatus for status filtering
  - Index on createdAt for date-based queries

3. Constraints
  - Foreign key constraints to branches and users
  - Amounts must be non-negative
  - Unique receipt ID across all sales
*/

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sales', {
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
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      receiptId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      taxAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discountAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      paymentMethod: {
        type: Sequelize.ENUM('cash', 'mpesa', 'card'),
        allowNull: false,
      },
      paymentStatus: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
      },
      customerPhone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customerEmail: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      voidedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      voidedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      voidReason: {
        type: Sequelize.TEXT,
        allowNull: true,
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
    await queryInterface.addIndex('sales', ['branchId']);
    await queryInterface.addIndex('sales', ['userId']);
    await queryInterface.addIndex('sales', ['receiptId'], { unique: true });
    await queryInterface.addIndex('sales', ['paymentStatus']);
    await queryInterface.addIndex('sales', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sales');
  }
};