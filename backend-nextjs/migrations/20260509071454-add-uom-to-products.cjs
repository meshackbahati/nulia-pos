'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'measurementType', {
      type: Sequelize.ENUM('discrete', 'measurable'),
      allowNull: false,
      defaultValue: 'discrete'
    });
    
    await queryInterface.addColumn('products', 'baseUnit', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'pcs'
    });

    await queryInterface.addColumn('products', 'fractionalSalesAllowed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('products', 'measurementType');
    await queryInterface.removeColumn('products', 'baseUnit');
    await queryInterface.removeColumn('products', 'fractionalSalesAllowed');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_products_measurementType";');
  }
};
