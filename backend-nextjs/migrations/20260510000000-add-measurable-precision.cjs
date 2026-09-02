'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Change minStockLevel and maxStockLevel to DECIMAL in inventory table
    await queryInterface.changeColumn('inventory', 'minStockLevel', {
      type: Sequelize.DECIMAL(14, 4),
      allowNull: false,
      defaultValue: 10.0
    });
    await queryInterface.changeColumn('inventory', 'maxStockLevel', {
      type: Sequelize.DECIMAL(14, 4),
      allowNull: false,
      defaultValue: 1000.0
    });

    // 2. Add new fields to products table
    await queryInterface.addColumn('products', 'minimumSaleQuantity', {
      type: Sequelize.DECIMAL(14, 4),
      allowNull: false,
      defaultValue: 1.0
    });
    await queryInterface.addColumn('products', 'purchaseUnit', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addColumn('products', 'conversionFactor', {
      type: Sequelize.DECIMAL(14, 4),
      allowNull: false,
      defaultValue: 1.0
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('products', 'conversionFactor');
    await queryInterface.removeColumn('products', 'purchaseUnit');
    await queryInterface.removeColumn('products', 'minimumSaleQuantity');

    await queryInterface.changeColumn('inventory', 'minStockLevel', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 10
    });
    await queryInterface.changeColumn('inventory', 'maxStockLevel', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1000
    });
  }
};
