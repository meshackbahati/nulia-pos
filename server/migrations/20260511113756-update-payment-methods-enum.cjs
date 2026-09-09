'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support easy ENUM updates in a transaction.
    // We will alter the columns to use simple STRING for maximum flexibility with Paystack methods.
    await queryInterface.changeColumn('sales', 'paymentMethod', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn('payments', 'method', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down (queryInterface, Sequelize) {
    // Reverting to ENUM is complex and potentially destructive if new methods exist.
    // Keeping as STRING for safety in down migration.
  }
};
