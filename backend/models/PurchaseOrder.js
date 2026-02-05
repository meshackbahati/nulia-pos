import { DataTypes, Model } from 'sequelize';

class PurchaseOrder extends Model {
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
                    allowNull: false
                },
                supplierId: {
                    type: DataTypes.UUID,
                    allowNull: false
                },
                orderNumber: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true
                },
                status: {
                    type: DataTypes.ENUM('pending', 'ordered', 'received', 'cancelled'),
                    defaultValue: 'pending'
                },
                totalAmount: {
                    type: DataTypes.DECIMAL(10, 2),
                    defaultValue: 0
                },
                expectedDeliveryDate: {
                    type: DataTypes.DATE,
                    allowNull: true
                },
                notes: {
                    type: DataTypes.TEXT,
                    allowNull: true
                },
                createdBy: {
                    type: DataTypes.UUID,
                    allowNull: false
                },
                metadata: {
                    type: DataTypes.JSONB,
                    allowNull: true
                },
            },
            {
                sequelize,
                modelName: 'PurchaseOrder',
                tableName: 'purchase_orders',
                indexes: [
                    { fields: ['branchId'] },
                    { fields: ['supplierId'] },
                    { fields: ['status'] }
                ]
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        this.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
        this.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
        this.hasMany(models.PurchaseOrderItem, { foreignKey: 'purchaseOrderId', as: 'items' });
    }
}

export default PurchaseOrder;
