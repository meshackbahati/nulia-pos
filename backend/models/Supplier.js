import { DataTypes, Model } from 'sequelize';

class Supplier extends Model {
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
                name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                contactPerson: {
                    type: DataTypes.STRING,
                    allowNull: true
                },
                email: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    validate: {
                        isEmail: true
                    }
                },
                phone: {
                    type: DataTypes.STRING,
                    allowNull: true
                },
                address: {
                    type: DataTypes.TEXT,
                    allowNull: true
                },
                website: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    validate: {
                        isUrl: true
                    }
                },
                isActive: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true
                },
                metadata: {
                    type: DataTypes.JSONB,
                    allowNull: true
                },
            },
            {
                sequelize,
                modelName: 'Supplier',
                tableName: 'suppliers',
                indexes: [
                    { fields: ['branchId'] },
                    { fields: ['name'] }
                ]
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
    }
}

export default Supplier;
