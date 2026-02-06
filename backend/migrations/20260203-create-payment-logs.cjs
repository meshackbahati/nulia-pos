'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('payment_logs', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            paymentId: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'payments',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            branchId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'branches',
                    key: 'id',
                },
            },
            saleId: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'sales',
                    key: 'id',
                },
            },
            transactionType: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'mpesa_stk, mpesa_c2b, cash, card, offline',
            },
            transactionId: {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'M-Pesa transaction code or card reference',
            },
            amount: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
            },
            currency: {
                type: Sequelize.STRING(3),
                defaultValue: 'KES',
            },
            customerPhone: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            customerName: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            status: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: 'pending, completed, failed, cancelled, verified',
            },
            paymentMethod: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            requestPayload: {
                type: Sequelize.JSON,
                allowNull: true,
                comment: 'Original request data',
            },
            responsePayload: {
                type: Sequelize.JSON,
                allowNull: true,
                comment: 'Response from payment gateway',
            },
            callbackData: {
                type: Sequelize.JSON,
                allowNull: true,
                comment: 'Callback/webhook data',
            },
            verifiedBy: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                comment: 'Admin/Manager who verified offline payment',
            },
            verifiedAt: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            verificationNotes: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            errorMessage: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            metadata: {
                type: Sequelize.JSON,
                allowNull: true,
                comment: 'Additional tracking data',
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

        // Indexes for efficient queries
        await queryInterface.addIndex('payment_logs', ['transactionId']);
        await queryInterface.addIndex('payment_logs', ['customerPhone']);
        await queryInterface.addIndex('payment_logs', ['status']);
        await queryInterface.addIndex('payment_logs', ['branchId', 'createdAt']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('payment_logs');
    },
};
