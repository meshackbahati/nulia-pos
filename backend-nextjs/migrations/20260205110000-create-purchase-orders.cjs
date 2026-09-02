'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('purchase_orders', {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4
            },
            branchId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'branches',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            supplierId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'suppliers',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            orderNumber: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            status: {
                type: Sequelize.ENUM('pending', 'ordered', 'received', 'cancelled'),
                defaultValue: 'pending'
            },
            totalAmount: {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 0
            },
            expectedDeliveryDate: {
                type: Sequelize.DATE,
                allowNull: true
            },
            notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            createdBy: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                }
            },
            metadata: {
                type: Sequelize.JSONB,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });

        await queryInterface.createTable('purchase_order_items', {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4
            },
            purchaseOrderId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'purchase_orders',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            productId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'products',
                    key: 'id'
                }
            },
            variantId: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'product_variants',
                    key: 'id'
                }
            },
            quantity: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            unitCost: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0
            },
            totalCost: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0
            },
            metadata: {
                type: Sequelize.JSONB,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });

        await queryInterface.addIndex('purchase_orders', ['branchId']);
        await queryInterface.addIndex('purchase_orders', ['supplierId']);
        await queryInterface.addIndex('purchase_orders', ['status']);
        await queryInterface.addIndex('purchase_order_items', ['purchaseOrderId']);
        await queryInterface.addIndex('purchase_order_items', ['productId']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('purchase_order_items');
        await queryInterface.dropTable('purchase_orders');
        // Note: We don't drop the ENUM type here as it might be shared, 
        // but in a clean environment Sequelize handles it or we'd use raw SQL.
    }
};
