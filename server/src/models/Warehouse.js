import { DataTypes, Model } from 'sequelize';

class Warehouse extends Model {
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
                name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                location: {
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
                modelName: 'Warehouse',
                tableName: 'warehouses',
                indexes: [{ fields: ['branchId'] }],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        this.hasMany(models.WarehouseZone, { foreignKey: 'warehouseId', as: 'zones' });
    }
}

export default Warehouse;
