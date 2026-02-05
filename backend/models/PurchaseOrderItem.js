import { DataTypes, Model } from 'sequelize';

class PurchaseOrderItem extends Model {
    static initialize(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                purchaseOrderId: {
                    type: DataTypes.UUID,
                    allowNull: false
                },
                productId: {
                    type: DataTypes.UUID,
                    allowNull: false
                },
                variantId: {
                    type: DataTypes.UUID,
                    allowNull: true
                },
                quantity: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    validate: { min: 1 }
                },
                unitCost: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0
                },
                totalCost: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0
                },
                metadata: {
                    type: DataTypes.JSONB,
                    allowNull: true
                },
            },
            {
                sequelize,
                modelName: 'PurchaseOrderItem',
                tableName: 'purchase_order_items',
                indexes: [
                    { fields: ['purchaseOrderId'] },
                    { fields: ['productId'] }
                ]
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.PurchaseOrder, { foreignKey: 'purchaseOrderId', as: 'purchaseOrder' });
        this.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
        this.belongsTo(models.ProductVariant, { foreignKey: 'variantId', as: 'variant' });
    }
}

export default PurchaseOrderItem;
