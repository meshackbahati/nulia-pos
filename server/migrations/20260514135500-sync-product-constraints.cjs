
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Ensure Products table is nullable for SKU and Barcode
    await queryInterface.changeColumn('products', 'sku', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });
    
    await queryInterface.changeColumn('products', 'barcode', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });

    // 2. Ensure ProductVariants table is nullable for SKU and Barcode
    try {
      await queryInterface.changeColumn('product_variants', 'sku', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      });
    } catch (e) {
      console.log('Skipping product_variants.sku change - might not exist');
    }

    try {
      await queryInterface.changeColumn('product_variants', 'barcode', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      });
    } catch (e) {
      console.log('Skipping product_variants.barcode change - might not exist');
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert to non-nullable where applicable (initial state)
    // Note: Reverting unique nullable to non-nullable requires careful data handling
    // We'll leave them nullable in down to prevent accidental data loss during dev undo
  }
};
