'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('branches', 'paystackPublicKey', {
            type: Sequelize.STRING,
            allowNull: true,
        });
        await queryInterface.addColumn('branches', 'paystackSecretKey', {
            type: Sequelize.TEXT,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('branches', 'paystackPublicKey');
        await queryInterface.removeColumn('branches', 'paystackSecretKey');
    }
};
