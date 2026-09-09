import { DataTypes, Model } from 'sequelize';

class WarehouseZone extends Model {
    static initialize(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                warehouseId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'warehouses', key: 'id' },
                },
                name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                code: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    comment: 'e.g. A3-B2 for Aisle 3, Shelf B2',
                },
            },
            {
                sequelize,
                modelName: 'WarehouseZone',
                tableName: 'warehouse_zones',
                timestamps: false,
                indexes: [{ fields: ['warehouseId'] }],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });
    }
}

export default WarehouseZone;
