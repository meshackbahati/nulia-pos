import { DataTypes, Model } from 'sequelize';

class Payment extends Model {
    // Instance methods
    isCompleted() {
        return this.status === 'completed';
    }

    canBeRefunded() {
        return this.status === 'completed' && this.method !== 'cash';
    }

    static generateReference() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 8);
        return `PAY-${timestamp}-${random}`.toUpperCase();
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
                saleId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: {
                        model: 'sales',
                        key: 'id',
                    },
                },
                amount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    validate: {
                        min: 0,
                    },
                },
                currency: {
                    type: DataTypes.STRING(3),
                    allowNull: false,
                    defaultValue: 'USD',
                },
                method: {
                    type: DataTypes.ENUM('cash', 'mpesa_stk', 'mpesa_c2b', 'card'),
                    allowNull: false,
                },
                status: {
                    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded'),
                    allowNull: false,
                    defaultValue: 'pending',
                },
                reference: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true,
                },
                externalReference: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                mpesaReceiptNumber: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                customerPhone: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    validate: {
                        len: [10, 20],
                    },
                },
                metadata: {
                    type: DataTypes.JSONB,
                    allowNull: true,
                },
                processedAt: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                failureReason: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
            },
            {
                sequelize,
                modelName: 'Payment',
                tableName: 'payments',
                hooks: {
                    beforeCreate: (payment) => {
                        if (!payment.reference) {
                            payment.reference = Payment.generateReference();
                        }
                    },
                },
                indexes: [
                    {
                        fields: ['branchId'],
                    },
                    {
                        fields: ['saleId'],
                    },
                    {
                        fields: ['reference'],
                        unique: true,
                    },
                    {
                        fields: ['externalReference'],
                    },
                    {
                        fields: ['status'],
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
        this.belongsTo(models.Sale, {
            foreignKey: 'saleId',
            as: 'sale',
        });
    }
}

export default Payment;
