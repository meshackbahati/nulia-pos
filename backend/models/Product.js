import { DataTypes, Model } from 'sequelize';

class Product extends Model {
    // Instance methods
    getProfitMargin() {
        if (this.costPrice === null || this.costPrice === undefined || Number(this.costPrice) <= 0) {
            return null;
        }

        return ((this.basePrice - this.costPrice) / this.costPrice) * 100;
    }

    static initialize(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    validate: {
                        len: [1, 200],
                    },
                },
                description: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                category: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    validate: {
                        len: [1, 100],
                    },
                },
                brand: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    validate: {
                        len: [1, 100],
                    },
                },
                basePrice: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    validate: {
                        min: 0,
                    },
                },
                costPrice: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: true,
                    validate: {
                        min: 0,
                    },
                },
                sku: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    unique: true,
                    set(value) {
                        this.setDataValue('sku', (value === '' || value === null || value === undefined) ? null : value);
                    },
                    validate: {
                        len: [0, 50],
                    },
                },
                barcode: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    unique: true,
                    set(value) {
                        this.setDataValue('barcode', (value === '' || value === null || value === undefined) ? null : value);
                    },
                    validate: {
                        len: [0, 50],
                    },
                },
                imageUrl: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    validate: {
                        isUrl: true,
                    },
                },
                barcodes: {
                    type: DataTypes.JSONB,
                    allowNull: true,
                    defaultValue: [],
                },
                isActive: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true,
                },
                metadata: {
                    type: DataTypes.JSONB,
                    allowNull: true,
                },
                measurementType: {
                    type: DataTypes.ENUM('discrete', 'measurable'),
                    allowNull: false,
                    defaultValue: 'discrete',
                },
                baseUnit: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    defaultValue: 'pcs',
                },
                fractionalSalesAllowed: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                minimumSaleQuantity: {
                    type: DataTypes.DECIMAL(14, 4),
                    allowNull: false,
                    defaultValue: 1.0,
                },
                purchaseUnit: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    defaultValue: null,
                },
                conversionFactor: {
                    type: DataTypes.DECIMAL(14, 4),
                    allowNull: false,
                    defaultValue: 1.0,
                },
            },
            {
                sequelize,
                modelName: 'Product',
                tableName: 'products',
                indexes: [
                    {
                        fields: ['category'],
                    },
                    {
                        fields: ['brand'],
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
        this.hasMany(models.ProductVariant, {
            foreignKey: 'productId',
            as: 'variants',
        });
        this.hasMany(models.Inventory, {
            foreignKey: 'productId',
            as: 'inventory',
        });
        this.hasMany(models.SaleItem, {
            foreignKey: 'productId',
            as: 'saleItems',
        });
    }
}

export default Product;
