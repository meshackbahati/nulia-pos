import { DataTypes, Model } from 'sequelize';

class Return extends Model {
    static generateReturnNumber() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `RET-${timestamp}-${random}`.toUpperCase();
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
                    references: { model: 'branches', key: 'id' },
                },
                saleId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'sales', key: 'id' },
                },
                customerId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: { model: 'customers', key: 'id' },
                },
                returnNumber: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true,
                },
                reason: {
                    type: DataTypes.ENUM('defective', 'wrong_item', 'customer_decision', 'expired', 'damaged', 'other'),
                    allowNull: false,
                },
                status: {
                    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed'),
                    defaultValue: 'pending',
                },
                notes: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                approvedBy: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: { model: 'users', key: 'id' },
                },
                createdBy: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'users', key: 'id' },
                },
                processedAt: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
            },
            {
                sequelize,
                modelName: 'Return',
                tableName: 'returns',
                hooks: {
                    beforeCreate: (ret) => {
                        if (!ret.returnNumber) {
                            ret.returnNumber = Return.generateReturnNumber();
                        }
                    },
                },
                indexes: [
                    { fields: ['branchId'] },
                    { fields: ['saleId'] },
                    { fields: ['status'] },
                    { fields: ['returnNumber'], unique: true },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        this.belongsTo(models.Sale, { foreignKey: 'saleId', as: 'sale' });
        this.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
        this.belongsTo(models.User, { foreignKey: 'approvedBy', as: 'approver' });
        this.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
        this.hasMany(models.ReturnItem, { foreignKey: 'returnId', as: 'items' });
    }
}

export default Return;
