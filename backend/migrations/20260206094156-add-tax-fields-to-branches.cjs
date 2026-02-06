'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('branches', 'taxRate', {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0.0,
        });
        await queryInterface.addColumn('branches', 'vatNumber', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('branches', 'taxRate');
        await queryInterface.removeColumn('branches', 'vatNumber');
    }
};
