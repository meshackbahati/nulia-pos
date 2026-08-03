import { DataTypes, Model } from 'sequelize';

class CustomerDeposit extends Model {
    static initialize(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                customerId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'customers', key: 'id' },
                },
                amount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                },
                type: {
                    type: DataTypes.ENUM('deposit', 'payment', 'credit', 'refund'),
                    allowNull: false,
                },
                referenceType: {
                    type: DataTypes.ENUM('sale', 'manual'),
                    allowNull: true,
                },
                referenceId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    comment: 'saleId or null for manual entries',
                },
                notes: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                recordedBy: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'users', key: 'id' },
                },
                recordedAt: {
                    type: DataTypes.DATE,
                    defaultValue: DataTypes.NOW,
                },
            },
            {
                sequelize,
                modelName: 'CustomerDeposit',
                tableName: 'customer_deposits',
                timestamps: false,
                indexes: [
                    { fields: ['customerId'] },
                    { fields: ['type'] },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
        this.belongsTo(models.User, { foreignKey: 'recordedBy', as: 'recorder' });
    }
}

export default CustomerDeposit;
