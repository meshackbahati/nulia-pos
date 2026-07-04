import { DataTypes, Model } from 'sequelize';

class Layaway extends Model {
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
                customerId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'customers', key: 'id' },
                },
                saleId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: { model: 'sales', key: 'id' },
                },
                totalAmount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                },
                depositAmount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0,
                },
                balance: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                },
                installmentCount: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                },
                installmentAmount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: true,
                },
                frequency: {
                    type: DataTypes.ENUM('weekly', 'biweekly', 'monthly'),
                    allowNull: true,
                },
                nextDueDate: {
                    type: DataTypes.DATEONLY,
                    allowNull: true,
                },
                status: {
                    type: DataTypes.ENUM('active', 'completed', 'defaulted', 'cancelled'),
                    defaultValue: 'active',
                },
                startedAt: {
                    type: DataTypes.DATE,
                    defaultValue: DataTypes.NOW,
                },
                completedAt: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                notes: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
            },
            {
                sequelize,
                modelName: 'Layaway',
                tableName: 'layaways',
                indexes: [
                    { fields: ['branchId'] },
                    { fields: ['customerId'] },
                    { fields: ['status'] },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        this.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
        this.belongsTo(models.Sale, { foreignKey: 'saleId', as: 'sale' });
    }
}

export default Layaway;
