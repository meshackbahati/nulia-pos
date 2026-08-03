import { DataTypes, Model } from 'sequelize';

class CashTransaction extends Model {
    static initialize(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                sessionId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'cash_sessions', key: 'id' },
                },
                type: {
                    type: DataTypes.ENUM('sale', 'expense', 'payout', 'topup', 'adjustment'),
                    allowNull: false,
                },
                amount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                },
                reference: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    comment: 'saleId, expenseId, etc.',
                },
                reason: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                createdBy: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'users', key: 'id' },
                },
                createdAt: {
                    type: DataTypes.DATE,
                    defaultValue: DataTypes.NOW,
                },
            },
            {
                sequelize,
                modelName: 'CashTransaction',
                tableName: 'cash_transactions',
                timestamps: false,
                indexes: [
                    { fields: ['sessionId'] },
                    { fields: ['type'] },
                    { fields: ['createdAt'] },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.CashSession, { foreignKey: 'sessionId', as: 'session' });
        this.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    }
}

export default CashTransaction;
