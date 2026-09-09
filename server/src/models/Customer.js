import { DataTypes, Model } from 'sequelize';

class Customer extends Model {
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
                firstName: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                lastName: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                phone: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                email: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    validate: { isEmail: true },
                },
                idNumber: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    comment: 'National ID / passport number',
                },
                creditLimit: {
                    type: DataTypes.DECIMAL(10, 2),
                    defaultValue: 0,
                    validate: { min: 0 },
                },
                currentBalance: {
                    type: DataTypes.DECIMAL(10, 2),
                    defaultValue: 0,
                    comment: 'outstanding credit balance',
                },
                notes: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                isActive: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true,
                },
            },
            {
                sequelize,
                modelName: 'Customer',
                tableName: 'customers',
                indexes: [
                    { fields: ['branchId'] },
                    { fields: ['phone'] },
                    { fields: ['email'] },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        this.hasMany(models.CustomerDeposit, { foreignKey: 'customerId', as: 'deposits' });
        this.hasMany(models.Layaway, { foreignKey: 'customerId', as: 'layaways' });
        this.hasMany(models.Return, { foreignKey: 'customerId', as: 'returns' });
    }
}

export default Customer;
