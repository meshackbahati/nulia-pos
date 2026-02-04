import { DataTypes, Model, Sequelize } from 'sequelize';

export interface PaymentAttributes {
  id: string;
  branchId: string;
  saleId?: string;
  amount: number;
  currency: string;
  method: 'cash' | 'mpesa_stk' | 'mpesa_c2b' | 'card';
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  reference: string;
  externalReference?: string;
  mpesaReceiptNumber?: string;
  customerPhone?: string;
  metadata?: any;
  processedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

class Payment extends Model<PaymentAttributes> implements PaymentAttributes {
  public id!: string;
  public branchId!: string;
  public saleId?: string;
  public amount!: number;
  public currency!: string;
  public method!: 'cash' | 'mpesa_stk' | 'mpesa_c2b' | 'card';
  public status!: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  public reference!: string;
  public externalReference?: string;
  public mpesaReceiptNumber?: string;
  public customerPhone?: string;
  public metadata?: any;
  public processedAt?: Date;
  public failureReason?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public isCompleted(): boolean {
    return this.status === 'completed';
  }

  public canBeRefunded(): boolean {
    return this.status === 'completed' && this.method !== 'cash';
  }

  public static generateReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8);
    return `PAY-${timestamp}-${random}`.toUpperCase();
  }

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
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'Payment',
        tableName: 'payments',
        hooks: {
          beforeCreate: (payment: Payment) => {
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

  public static associate(models: any) {
    Payment.belongsTo(models.Branch, {
      foreignKey: 'branchId',
      as: 'branch',
    });
    Payment.belongsTo(models.Sale, {
      foreignKey: 'saleId',
      as: 'sale',
    });
  }
}

export default Payment;