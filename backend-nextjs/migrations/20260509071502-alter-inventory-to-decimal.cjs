'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // MySQL/Postgres both support DECIMAL(14, 4)
    // We use changeColumn directly which will cast existing values
    
    await queryInterface.changeColumn('inventory', 'quantity', {
      type: Sequelize.DECIMAL(14, 4),
      allowNull: false,
      defaultValue: 0.0000
    });

    await queryInterface.changeColumn('inventory', 'reservedQuantity', {
      type: Sequelize.DECIMAL(14, 4),
      allowNull: false,
      defaultValue: 0.0000
    });

    await queryInterface.changeColumn('sale_items', 'quantity', {
      type: Sequelize.DECIMAL(14, 4),
      allowNull: false
    });

    // We also need to check purchase_order_items if it exists in the same way
    const tableInfo = await queryInterface.describeTable('purchase_order_items');
    if (tableInfo.quantity) {
      await queryInterface.changeColumn('purchase_order_items', 'quantity', {
        type: Sequelize.DECIMAL(14, 4),
        allowNull: false
      });
    }
  },

  async down (queryInterface, Sequelize) {
    // This is a destructive down-migration potentially if decimals were used
    // We round or truncate back to integer
    
    await queryInterface.changeColumn('inventory', 'quantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.changeColumn('inventory', 'reservedQuantity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.changeColumn('sale_items', 'quantity', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    const tableInfo = await queryInterface.describeTable('purchase_order_items');
    if (tableInfo.quantity) {
      await queryInterface.changeColumn('purchase_order_items', 'quantity', {
        type: Sequelize.INTEGER,
        allowNull: false
      });
    }
  }
};
