/*
# Create Sale Items Table

1. New Tables
  - `sale_items`
    - `id` (uuid, primary key)
    - `saleId` (uuid, foreign key to sales)
    - `productId` (uuid, foreign key to products)
    - `variantId` (uuid, foreign key to product_variants, nullable)
    - `quantity` (integer, not null, min 1)
    - `unitPrice` (decimal, not null)
    - `totalPrice` (decimal, not null)
    - `discountAmount` (decimal, not null, default 0)
    - `createdAt` (timestamp, not null)
    - `updatedAt` (timestamp, not null)

2. Indexes
  - Index on saleId for efficient sale item queries
  - Index on productId for product sales analysis

3. Constraints
  - Foreign key constraints to sales, products, and product_variants
  - Quantity must be at least 1
  - Prices must be non-negative
*/

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sale_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      saleId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'sales',
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
        onDelete: 'RESTRICT',
      },
      variantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'product_variants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      unitPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      totalPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      discountAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
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
    await queryInterface.addIndex('sale_items', ['saleId']);
    await queryInterface.addIndex('sale_items', ['productId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sale_items');
  }
};