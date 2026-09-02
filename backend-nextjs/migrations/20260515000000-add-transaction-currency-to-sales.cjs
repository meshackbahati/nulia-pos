'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('sales', 'transactionCurrency', {
      type: Sequelize.STRING(3),
      allowNull: true,
    });
    await queryInterface.addColumn('sales', 'transactionExchangeRate', {
      type: Sequelize.DECIMAL(18, 6),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('sales', 'transactionCurrency');
    await queryInterface.removeColumn('sales', 'transactionExchangeRate');
  }
};
