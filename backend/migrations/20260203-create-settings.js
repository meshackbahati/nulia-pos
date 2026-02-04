'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('settings', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            branchId: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'branches',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            category: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'payment, email, storage, general',
            },
            key: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            value: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Encrypted for sensitive data',
            },
            isEncrypted: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
            },
            createdBy: {
                type: Sequelize.UUID,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            updatedBy: {
                type: Sequelize.UUID,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });

        // Add unique constraint
        await queryInterface.addIndex('settings', ['branchId', 'category', 'key'], {
            unique: true,
            name: 'settings_branch_category_key_unique',
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('settings');
    },
};
