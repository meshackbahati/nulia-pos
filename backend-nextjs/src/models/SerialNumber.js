import { DataTypes, Model } from 'sequelize';

class SerialNumber extends Model {
    static initialize(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                productId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'products', key: 'id' },
                },
                branchId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'branches', key: 'id' },
                },
                serialNumber: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                batchNumber: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                expiryDate: {
                    type: DataTypes.DATEONLY,
                    allowNull: true,
                },
                status: {
                    type: DataTypes.ENUM('in_stock', 'sold', 'voided', 'returned'),
                    defaultValue: 'in_stock',
                },
                saleItemId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: { model: 'sale_items', key: 'id' },
                },
                costPrice: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: true,
                },
                soldPrice: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: true,
                },
                receivedAt: {
                    type: DataTypes.DATE,
                    defaultValue: DataTypes.NOW,
                },
                soldAt: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
            },
            {
                sequelize,
                modelName: 'SerialNumber',
                tableName: 'serial_numbers',
                indexes: [
                    { fields: ['serialNumber'], unique: true },
                    { fields: ['productId'] },
                    { fields: ['branchId'] },
                    { fields: ['status'] },
                    { fields: ['batchNumber'] },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
        this.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        this.belongsTo(models.SaleItem, { foreignKey: 'saleItemId', as: 'saleItem' });
    }
}

export default SerialNumber;
