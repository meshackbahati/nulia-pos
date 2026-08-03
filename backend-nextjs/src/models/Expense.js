import { DataTypes, Model } from 'sequelize';

class Expense extends Model {
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
                category: {
                    type: DataTypes.ENUM('utilities', 'rent', 'salaries', 'supplies', 'maintenance', 'transport', 'marketing', 'other'),
                    allowNull: false,
                },
                amount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    validate: { min: 0 },
                },
                description: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                paidBy: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'users', key: 'id' },
                },
                paidAt: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW,
                },
                receiptUrl: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                approvedBy: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: { model: 'users', key: 'id' },
                },
                currency: {
                    type: DataTypes.STRING(3),
                    allowNull: true,
                },
                exchangeRate: {
                    type: DataTypes.DECIMAL(18, 6),
                    allowNull: true,
                },
                baseAmount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: true,
                    comment: 'amount converted to branch base currency',
                },
                isApproved: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: false,
                },
            },
            {
                sequelize,
                modelName: 'Expense',
                tableName: 'expenses',
                indexes: [
                    { fields: ['branchId'] },
                    { fields: ['category'] },
                    { fields: ['paidAt'] },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        this.belongsTo(models.User, { foreignKey: 'paidBy', as: 'payer' });
        this.belongsTo(models.User, { foreignKey: 'approvedBy', as: 'approver' });
    }
}

export default Expense;
