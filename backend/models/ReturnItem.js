import { DataTypes, Model } from 'sequelize';

class ReturnItem extends Model {
    static initialize(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                returnId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'returns', key: 'id' },
                },
                saleItemId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'sale_items', key: 'id' },
                },
                productId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'products', key: 'id' },
                },
                variantId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: { model: 'product_variants', key: 'id' },
                },
                quantityReturned: {
                    type: DataTypes.DECIMAL(14, 4),
                    allowNull: false,
                    validate: { min: 0 },
                },
                refundAmount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    validate: { min: 0 },
                },
                restock: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true,
                    comment: 'should the item go back to inventory',
                },
                condition: {
                    type: DataTypes.ENUM('new', 'used', 'damaged'),
                    defaultValue: 'used',
                },
                serialNumberId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: { model: 'serial_numbers', key: 'id' },
                },
            },
            {
                sequelize,
                modelName: 'ReturnItem',
                tableName: 'return_items',
                indexes: [
                    { fields: ['returnId'] },
                    { fields: ['saleItemId'] },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Return, { foreignKey: 'returnId', as: 'return' });
        this.belongsTo(models.SaleItem, { foreignKey: 'saleItemId', as: 'saleItem' });
        this.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
        this.belongsTo(models.ProductVariant, { foreignKey: 'variantId', as: 'variant' });
        this.belongsTo(models.SerialNumber, { foreignKey: 'serialNumberId', as: 'serialNumber' });
    }
}

export default ReturnItem;
