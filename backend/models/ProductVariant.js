import { DataTypes, Model } from 'sequelize';

class ProductVariant extends Model {
    static initialize(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                productId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: {
                        model: 'products',
                        key: 'id',
                    },
                },
                name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    validate: {
                        len: [1, 200],
                    },
                },
                sku: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true,
                    validate: {
                        len: [1, 50],
                    },
                },
                barcode: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    unique: true,
                    validate: {
                        len: [8, 50],
                    },
                },
                price: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    validate: {
                        min: 0,
                    },
                },
                costPrice: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    validate: {
                        min: 0,
                    },
                },
                attributes: {
                    type: DataTypes.JSONB,
                    allowNull: true,
                },
                isActive: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true,
                },
            },
            {
                sequelize,
                modelName: 'ProductVariant',
                tableName: 'product_variants',
                indexes: [
                    {
                        fields: ['productId'],
                    },
                    {
                        fields: ['sku'],
                        unique: true,
                    },
                    {
                        fields: ['barcode'],
                        unique: true,
                    },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Product, {
            foreignKey: 'productId',
            as: 'product',
        });
        this.hasMany(models.Inventory, {
            foreignKey: 'variantId',
            as: 'inventory',
        });
        this.hasMany(models.SaleItem, {
            foreignKey: 'variantId',
            as: 'saleItems',
        });
    }
}

export default ProductVariant;
