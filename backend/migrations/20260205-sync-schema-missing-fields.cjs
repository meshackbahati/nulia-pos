'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add missing columns to branches
        await queryInterface.addColumn('branches', 'secondaryCurrency', {
            type: Sequelize.STRING(3),
            allowNull: true,
        });

        await queryInterface.addColumn('branches', 'exchangeRate', {
            type: Sequelize.DECIMAL(10, 4),
            allowNull: true,
            defaultValue: 1.0,
        });

        await queryInterface.addColumn('branches', 'managedBy', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });

        // Add missing column to users
        await queryInterface.addColumn('users', 'createdBy', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });
    },

    async down(queryInterface, Sequelize) {
        // Remove columns in reverse order
        await queryInterface.removeColumn('users', 'createdBy');
        await queryInterface.removeColumn('branches', 'managedBy');
        await queryInterface.removeColumn('branches', 'exchangeRate');
        await queryInterface.removeColumn('branches', 'secondaryCurrency');
    }
};
