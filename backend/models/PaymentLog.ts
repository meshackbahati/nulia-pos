import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/lib/database';

interface PaymentLogAttributes {
    id: string;
    paymentId?: string;
    branchId: string;
    saleId?: string;
    transactionType: string;
    transactionId?: string;
    amount: number;
    currency: string;
    customerPhone?: string;
    customerName?: string;
    status: string;
    paymentMethod: string;
    requestPayload?: any;
    responsePayload?: any;
    callbackData?: any;
    verifiedBy?: string;
    verifiedAt?: Date;
    verificationNotes?: string;
    errorMessage?: string;
    metadata?: any;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PaymentLogCreationAttributes extends Optional<PaymentLogAttributes, 'id' | 'currency'> { }

class PaymentLog extends Model<PaymentLogAttributes, PaymentLogCreationAttributes> implements PaymentLogAttributes {
    declare id: string;
    declare paymentId?: string;
    declare branchId: string;
    declare saleId?: string;
    declare transactionType: string;
    declare transactionId?: string;
    declare amount: number;
    declare currency: string;
    declare customerPhone?: string;
    declare customerName?: string;
    declare status: string;
    declare paymentMethod: string;
    declare requestPayload?: any;
    declare responsePayload?: any;
    declare callbackData?: any;
    declare verifiedBy?: string;
    declare verifiedAt?: Date;
    declare verificationNotes?: string;
    declare errorMessage?: string;
    declare metadata?: any;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    // Relations
    declare payment?: any;
    declare branch?: any;
    declare sale?: any;
    declare verifier?: any;

    static init(sequelize: any): typeof PaymentLog {
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
                    defaultValue: 'USD',
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

    static associate(models: any) {
        PaymentLog.belongsTo(models.Payment, {
            foreignKey: 'paymentId',
            as: 'payment',
        });
        PaymentLog.belongsTo(models.Branch, {
            foreignKey: 'branchId',
            as: 'branch',
        });
        PaymentLog.belongsTo(models.Sale, {
            foreignKey: 'saleId',
            as: 'sale',
        });
        PaymentLog.belongsTo(models.User, {
            foreignKey: 'verifiedBy',
            as: 'verifier',
        });
    }
}

export default PaymentLog;
