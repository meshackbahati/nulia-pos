import { DataTypes, Model, Sequelize } from 'sequelize';

export interface SupplierAttributes {
    id: string;
    branchId: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    isActive: boolean;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
}

class Supplier extends Model<SupplierAttributes> implements SupplierAttributes {
    public id!: string;
    public branchId!: string;
    public name!: string;
    public contactPerson?: string;
    public email?: string;
    public phone?: string;
    public address?: string;
    public website?: string;
    public isActive!: boolean;
    public metadata?: any;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public static init(sequelize: Sequelize) {
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
                createdAt: {
                    type: DataTypes.DATE,
                    allowNull: false
                },
                updatedAt: {
                    type: DataTypes.DATE,
                    allowNull: false
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

    public static associate(models: any) {
        Supplier.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        // Supplier.hasMany(models.PurchaseOrder, { foreignKey: 'supplierId', as: 'purchaseOrders' });
    }
}

export default Supplier;
