import { DataTypes, Model, Sequelize } from 'sequelize';

export interface SaleAttributes {
  id: string;
  branchId: string;
  userId: string;
  receiptId: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'mpesa' | 'card';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  voidedAt?: Date;
  voidedBy?: string;
  voidReason?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

class Sale extends Model<SaleAttributes> implements SaleAttributes {
  public id!: string;
  public branchId!: string;
  public userId!: string;
  public receiptId!: string;
  public subtotal!: number;
  public taxAmount!: number;
  public discountAmount!: number;
  public totalAmount!: number;
  public paymentMethod!: 'cash' | 'mpesa' | 'card';
  public paymentStatus!: 'pending' | 'completed' | 'failed' | 'refunded';
  public customerPhone?: string;
  public customerEmail?: string;
  public notes?: string;
  public voidedAt?: Date;
  public voidedBy?: string;
  public voidReason?: string;
  public metadata?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public isVoided(): boolean {
    return this.voidedAt !== null;
  }

  public canBeVoided(): boolean {
    return !this.isVoided() && this.paymentStatus !== 'refunded';
  }

  public static generateReceiptId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `RCP-${timestamp}-${random}`.toUpperCase();
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
        modelName: 'Sale',
        tableName: 'sales',
        hooks: {
          beforeCreate: (sale: Sale) => {
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

  public static associate(models: any) {
    Sale.belongsTo(models.Branch, {
      foreignKey: 'branchId',
      as: 'branch',
    });
    Sale.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    Sale.belongsTo(models.User, {
      foreignKey: 'voidedBy',
      as: 'voidedByUser',
    });
    Sale.hasMany(models.SaleItem, {
      foreignKey: 'saleId',
      as: 'items',
    });
    Sale.hasMany(models.Payment, {
      foreignKey: 'saleId',
      as: 'payments',
    });
  }
}

export default Sale;