import { DataTypes, Model, Sequelize } from 'sequelize';

export interface PurchaseOrderItemAttributes {
    id: string;
    purchaseOrderId: string;
    productId: string;
    variantId?: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
}

class PurchaseOrderItem extends Model<PurchaseOrderItemAttributes> implements PurchaseOrderItemAttributes {
    public id!: string;
    public purchaseOrderId!: string;
    public productId!: string;
    public variantId?: string;
    public quantity!: number;
    public unitCost!: number;
    public totalCost!: number;
    public metadata?: any;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public static init(sequelize: Sequelize) {
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
                createdAt: {
                    type: DataTypes.DATE,
                    allowNull: false
                },
                updatedAt: {
                    type: DataTypes.DATE,
                    allowNull: false
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

    public static associate(models: any) {
        PurchaseOrderItem.belongsTo(models.PurchaseOrder, { foreignKey: 'purchaseOrderId', as: 'purchaseOrder' });
        PurchaseOrderItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
        PurchaseOrderItem.belongsTo(models.ProductVariant, { foreignKey: 'variantId', as: 'variant' });
    }
}

export default PurchaseOrderItem;
