'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Check if column exists first to avoid errors
        const tableInfo = await queryInterface.describeTable('sale_items');
        if (!tableInfo.branchId) {
            await queryInterface.addColumn('sale_items', 'branchId', {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'branches',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
        }
    },

    async down(queryInterface, Sequelize) {
        const tableInfo = await queryInterface.describeTable('sale_items');
        if (tableInfo.branchId) {
            await queryInterface.removeColumn('sale_items', 'branchId');
        }
    }
};
