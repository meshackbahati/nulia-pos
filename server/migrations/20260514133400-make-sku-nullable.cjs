
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Alter products table
    await queryInterface.changeColumn('products', 'sku', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });

    // 2. Alter product_variants table if it exists and has sku
    try {
      await queryInterface.changeColumn('product_variants', 'sku', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      });
    } catch (e) {
      console.log('Skipping product_variants.sku (maybe already handled or table missing)');
    }
    
    // 3. Ensure barcode is also nullable and unique
    await queryInterface.changeColumn('products', 'barcode', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('products', 'sku', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });
    
    try {
      await queryInterface.changeColumn('product_variants', 'sku', {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      });
    } catch (e) {}
  }
};
