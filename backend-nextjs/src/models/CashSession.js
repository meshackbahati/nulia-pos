import { DataTypes, Model } from 'sequelize';

class CashSession extends Model {
    static initialize(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                registerId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'cash_registers', key: 'id' },
                },
                openedBy: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'users', key: 'id' },
                },
                closedBy: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: { model: 'users', key: 'id' },
                },
                openingBalance: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0,
                },
                closingBalance: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: true,
                },
                expectedBalance: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: true,
                    comment: 'openingBalance + cashSales - cashExpenses',
                },
                difference: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: true,
                },
                openedAt: {
                    type: DataTypes.DATE,
                    defaultValue: DataTypes.NOW,
                },
                closedAt: {
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
                timestamps: false,
                modelName: 'CashSession',
                tableName: 'cash_sessions',
                indexes: [
                    { fields: ['registerId'] },
                    { fields: ['openedAt'] },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.CashRegister, { foreignKey: 'registerId', as: 'register' });
        this.belongsTo(models.User, { foreignKey: 'openedBy', as: 'opener' });
        this.belongsTo(models.User, { foreignKey: 'closedBy', as: 'closer' });
        this.hasMany(models.CashTransaction, { foreignKey: 'sessionId', as: 'transactions' });
    }
}

export default CashSession;
