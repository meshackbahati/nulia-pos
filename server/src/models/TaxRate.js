import { DataTypes, Model } from 'sequelize';

class TaxRate extends Model {
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
                    allowNull: true,
                    references: { model: 'branches', key: 'id' },
                },
                name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                rate: {
                    type: DataTypes.DECIMAL(5, 2),
                    allowNull: false,
                    validate: { min: 0, max: 100 },
                },
                type: {
                    type: DataTypes.ENUM('inclusive', 'exclusive'),
                    allowNull: false,
                    defaultValue: 'exclusive',
                },
                isDefault: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: false,
                },
                appliesTo: {
                    type: DataTypes.JSONB,
                    allowNull: true,
                    comment: 'null = all products, otherwise array of category names or product IDs',
                },
                isActive: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true,
                },
            },
            {
                sequelize,
                modelName: 'TaxRate',
                tableName: 'tax_rates',
                indexes: [
                    { fields: ['branchId'] },
                    { fields: ['isDefault'] },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
    }
}

export default TaxRate;
