import { DataTypes, Model } from 'sequelize';

class PaymentLog extends Model {
    static initialize(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                paymentId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                branchId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                },
                saleId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                transactionType: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                transactionId: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                amount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                },
                currency: {
                    type: DataTypes.STRING(3),
                    defaultValue: 'KES',
                },
                customerPhone: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                customerName: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                status: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                paymentMethod: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                requestPayload: {
                    type: DataTypes.JSON,
                    allowNull: true,
                },
                responsePayload: {
                    type: DataTypes.JSON,
                    allowNull: true,
                },
                callbackData: {
                    type: DataTypes.JSON,
                    allowNull: true,
                },
                verifiedBy: {
                    type: DataTypes.UUID,
                    allowNull: true,
                },
                verifiedAt: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                verificationNotes: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                errorMessage: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                metadata: {
                    type: DataTypes.JSON,
                    allowNull: true,
                },
            },
            {
                sequelize,
                tableName: 'payment_logs',
                timestamps: true,
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Payment, {
            foreignKey: 'paymentId',
            as: 'payment',
        });
        this.belongsTo(models.Branch, {
            foreignKey: 'branchId',
            as: 'branch',
        });
        this.belongsTo(models.Sale, {
            foreignKey: 'saleId',
            as: 'sale',
        });
        this.belongsTo(models.User, {
            foreignKey: 'verifiedBy',
            as: 'verifier',
        });
    }
}

export default PaymentLog;
