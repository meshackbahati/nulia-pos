import { DataTypes, Model } from 'sequelize';

class ProductBundle extends Model {
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
                    references: { model: 'products', key: 'id' },
                    comment: 'the bundle parent product',
                },
                componentProductId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'products', key: 'id' },
                },
                componentVariantId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: { model: 'product_variants', key: 'id' },
                },
                quantity: {
                    type: DataTypes.DECIMAL(14, 4),
                    allowNull: false,
                    defaultValue: 1,
                    validate: { min: 0 },
                },
                isActive: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true,
                },
            },
            {
                sequelize,
                modelName: 'ProductBundle',
                tableName: 'product_bundles',
                indexes: [
                    { fields: ['productId'] },
                    { fields: ['componentProductId'] },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Product, { foreignKey: 'productId', as: 'bundleProduct' });
        this.belongsTo(models.Product, { foreignKey: 'componentProductId', as: 'componentProduct' });
        this.belongsTo(models.ProductVariant, { foreignKey: 'componentVariantId', as: 'componentVariant' });
    }
}

export default ProductBundle;
