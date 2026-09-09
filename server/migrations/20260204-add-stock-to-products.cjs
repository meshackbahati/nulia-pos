/*
# Add Stock Tracking to Products

Adds stock quantity and low stock threshold fields to products table
for real-time inventory monitoring without complex inventory tracking.

Fields:
- stockQuantity: Current available stock
- lowStockThreshold: Alert when stock falls below this
*/

'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('products', 'stockQuantity', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        });

        await queryInterface.addColumn('products', 'lowStockThreshold', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 10,
        });

        // Add index for low stock queries
        await queryInterface.addIndex('products', ['stockQuantity']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('products', 'stockQuantity');
        await queryInterface.removeColumn('products', 'lowStockThreshold');
    }
};
