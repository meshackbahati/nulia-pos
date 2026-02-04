import { DataTypes, Model, Sequelize } from 'sequelize';

export interface PurchaseOrderAttributes {
    id: string;
    branchId: string;
    supplierId: string;
    orderNumber: string;
    status: 'pending' | 'ordered' | 'received' | 'cancelled';
    totalAmount: number;
    expectedDeliveryDate?: Date;
    notes?: string;
    createdBy: string;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
}

class PurchaseOrder extends Model<PurchaseOrderAttributes> implements PurchaseOrderAttributes {
    public id!: string;
    public branchId!: string;
    public supplierId!: string;
    public orderNumber!: string;
    public status!: 'pending' | 'ordered' | 'received' | 'cancelled';
    public totalAmount!: number;
    public expectedDeliveryDate?: Date;
    public notes?: string;
    public createdBy!: string;
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

    public static associate(models: any) {
        PurchaseOrder.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        PurchaseOrder.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
        PurchaseOrder.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
        PurchaseOrder.hasMany(models.PurchaseOrderItem, { foreignKey: 'purchaseOrderId', as: 'items' });
    }
}

export default PurchaseOrder;
