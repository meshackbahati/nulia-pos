'use strict';

const { Sequelize } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Update purchase_orders where totalAmount is 'NaN' (if stored as string or somehow allowed) or 0
        // Actually, if it's DECIMAL, it might be stored as 'NaN' in older postgres, or simply 0 if sanitized.
        // However, we want to reset any weird values. 
        // Since we can't recover the data, we'll set them to 0.00 to show "0.00 KES" instead of "NaN KES" on older versions without the frontend fix.

        // Check if totalAmount is NaN (Postgres numeric 'NaN')
        await queryInterface.sequelize.query(`
      UPDATE "purchase_orders"
      SET "totalAmount" = 0
      WHERE "totalAmount" = 'NaN';
    `);

        // Also update any order items where unitCost is 0 but we want to be clean?
        // No, we can't guess the cost. 
    },

    down: async (queryInterface, Sequelize) => {
        // No rollback possible for data correction
    }
};
