'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('sale_items', 'catalogPrice', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('sale_items', 'catalogPrice');
  }
};
