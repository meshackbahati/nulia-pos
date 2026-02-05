'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('products', 'barcodes', {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: [],
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('products', 'barcodes');
    }
};
