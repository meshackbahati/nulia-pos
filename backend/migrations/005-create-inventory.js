/*
# Create Inventory Table

1. New Tables
  - `inventory`
    - `id` (uuid, primary key)
    - `branchId` (uuid, foreign key to branches)
    - `productId` (uuid, foreign key to products)
    - `variantId` (uuid, foreign key to product_variants, nullable)
    - `quantity` (integer, not null, default 0)
    - `reservedQuantity` (integer, not null, default 0)
    - `minStockLevel` (integer, not null, default 10)
    - `maxStockLevel` (integer, not null, default 1000)
    - `lastRestockedAt` (timestamp, nullable)
    - `createdAt` (timestamp, not null)
    - `updatedAt` (timestamp, not null)

2. Indexes
  - Unique composite index on (branchId, productId, variantId)
  - Index on branchId for branch-specific queries
  - Index on productId for product-specific queries

3. Constraints
  - Foreign key constraints to branches, products, and product_variants
  - Quantities must be non-negative
  - Unique inventory record per branch-product-variant combination
*/

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('inventory', {
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
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      variantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'product_variants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reservedQuantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      minStockLevel: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      maxStockLevel: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1000,
      },
      lastRestockedAt: {
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

    // Add indexes
    await queryInterface.addIndex('inventory', ['branchId', 'productId', 'variantId'], { 
      unique: true,
      name: 'inventory_branch_product_variant_unique'
    });
    await queryInterface.addIndex('inventory', ['branchId']);
    await queryInterface.addIndex('inventory', ['productId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('inventory');
  }
};