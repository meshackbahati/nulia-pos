'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('products', 'costPrice', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
        });

        await queryInterface.changeColumn('product_variants', 'costPrice', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.changeColumn('products', 'costPrice', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        });

        await queryInterface.changeColumn('product_variants', 'costPrice', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        });
    },
};
