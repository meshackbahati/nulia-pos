import { DataTypes, Model } from 'sequelize';

class SaleItem extends Model {
    static initialize(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                saleId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: {
                        model: 'sales',
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
                branchId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: {
                        model: 'branches',
                        key: 'id',
                    },
                },
                quantity: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    validate: {
                        min: 1,
                    },
                },
                unitPrice: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    validate: {
                        min: 0,
                    },
                },
                totalPrice: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    validate: {
                        min: 0,
                    },
                },
                discountAmount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0,
                    validate: {
                        min: 0,
                    },
                },
            },
            {
                sequelize,
                modelName: 'SaleItem',
                tableName: 'sale_items',
                indexes: [
                    {
                        fields: ['saleId'],
                    },
                    {
                        fields: ['productId'],
                    },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Sale, {
            foreignKey: 'saleId',
            as: 'sale',
        });
        this.belongsTo(models.Product, {
            foreignKey: 'productId',
            as: 'product',
        });
        this.belongsTo(models.ProductVariant, {
            foreignKey: 'variantId',
            as: 'variant',
        });
        this.belongsTo(models.Branch, {
            foreignKey: 'branchId',
            as: 'branch',
        });
    }
}

export default SaleItem;
