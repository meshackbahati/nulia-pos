/*
# Create Product Variants Table

1. New Tables
  - `product_variants`
    - `id` (uuid, primary key)
    - `productId` (uuid, foreign key to products)
    - `name` (text, not null)
    - `sku` (text, unique, not null)
    - `barcode` (text, unique, nullable)
    - `price` (decimal, not null)
    - `costPrice` (decimal, not null)
    - `attributes` (jsonb, nullable) - for size, color, etc.
    - `isActive` (boolean, default true)
    - `createdAt` (timestamp, not null)
    - `updatedAt` (timestamp, not null)

2. Indexes
  - Index on productId for efficient product variant queries
  - Unique index on SKU
  - Unique index on barcode
  - Index on isActive for filtering

3. Constraints
  - Foreign key constraint to products table
  - Prices must be non-negative
  - SKU must be unique across all variants
*/

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_variants', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sku: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      barcode: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      costPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      attributes: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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
    await queryInterface.addIndex('product_variants', ['productId']);
    await queryInterface.addIndex('product_variants', ['sku'], { unique: true });
    await queryInterface.addIndex('product_variants', ['barcode'], { unique: true });
    await queryInterface.addIndex('product_variants', ['isActive']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('product_variants');
  }
};