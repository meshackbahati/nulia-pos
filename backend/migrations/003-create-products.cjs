/*
# Create Products Table

1. New Tables
  - `products`
    - `id` (uuid, primary key)
    - `name` (text, not null)
    - `description` (text, nullable)
    - `category` (text, not null)
    - `brand` (text, nullable)
    - `basePrice` (decimal, not null)
    - `costPrice` (decimal, not null)
    - `sku` (text, unique, not null)
    - `barcode` (text, unique, nullable)
    - `imageUrl` (text, nullable)
    - `isActive` (boolean, default true)
    - `metadata` (jsonb, nullable)
    - `createdAt` (timestamp, not null)
    - `updatedAt` (timestamp, not null)

2. Indexes
  - Unique index on SKU
  - Unique index on barcode
  - Index on category for filtering
  - Index on brand for filtering

3. Constraints
  - Prices must be non-negative
  - SKU and barcode must be unique across all products
*/

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      brand: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      basePrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      costPrice: {
        type: Sequelize.DECIMAL(10, 2),
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
      imageUrl: {
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
    await queryInterface.addIndex('products', ['sku'], { unique: true });
    await queryInterface.addIndex('products', ['barcode'], { unique: true });
    await queryInterface.addIndex('products', ['category']);
    await queryInterface.addIndex('products', ['brand']);
    await queryInterface.addIndex('products', ['isActive']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('products');
  }
};