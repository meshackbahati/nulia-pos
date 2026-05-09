import { DataTypes, Model } from 'sequelize';

class Inventory extends Model {
    // Instance methods
    getAvailableQuantity() {
        return this.quantity - this.reservedQuantity;
    }

    isLowStock() {
        return this.getAvailableQuantity() <= this.minStockLevel;
    }

    isOutOfStock() {
        return this.getAvailableQuantity() <= 0;
    }

    canFulfillOrder(requestedQuantity) {
        return this.getAvailableQuantity() >= requestedQuantity;
    }

    static initialize(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                branchId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: {
                        model: 'branches',
                        key: 'id',
                    },
                },
                productId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: {
                        model: 'products',
                        key: 'id',
                    },
                },
                variantId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: {
                        model: 'product_variants',
                        key: 'id',
                    },
                },
                quantity: {
                    type: DataTypes.DECIMAL(14, 4),
                    allowNull: false,
                    defaultValue: 0,
                    validate: {
                        min: 0,
                    },
                },
                reservedQuantity: {
                    type: DataTypes.DECIMAL(14, 4),
                    allowNull: false,
                    defaultValue: 0,
                    validate: {
                        min: 0,
                    },
                },
                minStockLevel: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 10,
                    validate: {
                        min: 0,
                    },
                },
                maxStockLevel: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 1000,
                    validate: {
                        min: 0,
                    },
                },
                lastRestockedAt: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
            },
            {
                sequelize,
                modelName: 'Inventory',
                tableName: 'inventory',
                indexes: [
                    {
                        fields: ['branchId', 'productId', 'variantId'],
                        unique: true,
                    },
                    {
                        fields: ['branchId'],
                    },
                    {
                        fields: ['productId'],
                    },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, {
            foreignKey: 'branchId',
            as: 'branch',
        });
        this.belongsTo(models.Product, {
            foreignKey: 'productId',
            as: 'product',
        });
        this.belongsTo(models.ProductVariant, {
            foreignKey: 'variantId',
            as: 'variant',
        });
    }
}

export default Inventory;
