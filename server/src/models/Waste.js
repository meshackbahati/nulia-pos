import { DataTypes, Model } from 'sequelize';

class Waste extends Model {
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
                productId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'products', key: 'id' },
                },
                variantId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: { model: 'product_variants', key: 'id' },
                },
                quantity: {
                    type: DataTypes.DECIMAL(14, 4),
                    allowNull: false,
                    validate: { min: 0 },
                },
                reason: {
                    type: DataTypes.ENUM('spoilage', 'damage', 'expired', 'theft', 'breakage', 'other'),
                    allowNull: false,
                },
                notes: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                costValue: {
                    type: DataTypes.DECIMAL(10, 2),
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
                modelName: 'Waste',
                tableName: 'waste',
                timestamps: false,
                indexes: [
                    { fields: ['branchId'] },
                    { fields: ['productId'] },
                    { fields: ['reason'] },
                    { fields: ['recordedAt'] },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        this.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
        this.belongsTo(models.ProductVariant, { foreignKey: 'variantId', as: 'variant' });
        this.belongsTo(models.User, { foreignKey: 'recordedBy', as: 'recorder' });
    }
}

export default Waste;
