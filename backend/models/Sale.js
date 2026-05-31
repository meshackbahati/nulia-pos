import { DataTypes, Model } from 'sequelize';

class Sale extends Model {
    // Instance methods
    isVoided() {
        return this.voidedAt !== null;
    }

    canBeVoided() {
        return !this.isVoided() && this.paymentStatus !== 'refunded';
    }

    static generateReceiptId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `RCP-${timestamp}-${random}`.toUpperCase();
    }

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
                    references: {
                        model: 'branches',
                        key: 'id',
                    },
                },
                userId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: {
                        model: 'users',
                        key: 'id',
                    },
                },
                receiptId: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true,
                },
                subtotal: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    validate: {
                        min: 0,
                    },
                },
                taxAmount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0,
                    validate: {
                        min: 0,
                    },
                },
                discountAmount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0,
                    validate: {
                        min: 0,
                    },
                },
                totalAmount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    validate: {
                        min: 0,
                    },
                },
                transactionCurrency: {
                    type: DataTypes.STRING(3),
                    allowNull: true,
                },
                transactionExchangeRate: {
                    type: DataTypes.DECIMAL(18, 6),
                    allowNull: true,
                },
                paymentMethod: {
                    type: DataTypes.ENUM('cash', 'mpesa', 'card'),
                    allowNull: false,
                },
                paymentStatus: {
                    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
                    allowNull: false,
                    defaultValue: 'pending',
                },
                customerPhone: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    validate: {
                        len: [10, 20],
                    },
                },
                customerEmail: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    validate: {
                        isEmail: true,
                    },
                },
                notes: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                voidedAt: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                voidedBy: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id',
                    },
                },
                voidReason: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                metadata: {
                    type: DataTypes.JSONB,
                    allowNull: true,
                },
            },
            {
                sequelize,
                modelName: 'Sale',
                tableName: 'sales',
                hooks: {
                    beforeCreate: (sale) => {
                        if (!sale.receiptId) {
                            sale.receiptId = Sale.generateReceiptId();
                        }
                    },
                },
                indexes: [
                    {
                        fields: ['branchId'],
                    },
                    {
                        fields: ['userId'],
                    },
                    {
                        fields: ['receiptId'],
                        unique: true,
                    },
                    {
                        fields: ['paymentStatus'],
                    },
                    {
                        fields: ['createdAt'],
                    },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, {
            foreignKey: 'branchId',
            as: 'branch',
        });
        this.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
        });
        this.belongsTo(models.User, {
            foreignKey: 'voidedBy',
            as: 'voidedByUser',
        });
        this.hasMany(models.SaleItem, {
            foreignKey: 'saleId',
            as: 'items',
        });
        this.hasMany(models.Payment, {
            foreignKey: 'saleId',
            as: 'payments',
        });
    }
}

export default Sale;
