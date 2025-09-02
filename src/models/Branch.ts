import { DataTypes, Model, Sequelize } from 'sequelize';
import { encrypt, decrypt } from '@/lib/encryption';

export interface BranchAttributes {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  mpesaConsumerKey?: string;
  mpesaConsumerSecret?: string;
  mpesaPasskey?: string;
  mpesaShortcode?: string;
  mpesaCallbackUrl?: string;
  isActive: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

class Branch extends Model<BranchAttributes> implements BranchAttributes {
  public id!: string;
  public name!: string;
  public address!: string;
  public phone!: string;
  public email!: string;
  public currency!: string;
  public currencySymbol!: string;
  public timezone!: string;
  public mpesaConsumerKey?: string;
  public mpesaConsumerSecret?: string;
  public mpesaPasskey?: string;
  public mpesaShortcode?: string;
  public mpesaCallbackUrl?: string;
  public isActive!: boolean;
  public metadata?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public getMpesaCredentials() {
    return {
      consumerKey: this.mpesaConsumerKey ? decrypt(this.mpesaConsumerKey) : null,
      consumerSecret: this.mpesaConsumerSecret ? decrypt(this.mpesaConsumerSecret) : null,
      passkey: this.mpesaPasskey ? decrypt(this.mpesaPasskey) : null,
      shortcode: this.mpesaShortcode,
    };
  }

  public generateCallbackUrl(): string {
    const baseUrl = process.env.MPESA_CALLBACK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
    return `${baseUrl}/branch/${this.id}/callback`;
  }

  public static init(sequelize: Sequelize) {
    return super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [1, 200],
          },
        },
        address: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        phone: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [10, 20],
          },
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            isEmail: true,
          },
        },
        currency: {
          type: DataTypes.STRING(3),
          allowNull: false,
          defaultValue: process.env.DEFAULT_CURRENCY || 'USD',
        },
        currencySymbol: {
          type: DataTypes.STRING(5),
          allowNull: false,
          defaultValue: process.env.DEFAULT_CURRENCY_SYMBOL || '$',
        },
        timezone: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'UTC',
        },
        mpesaConsumerKey: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        mpesaConsumerSecret: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        mpesaPasskey: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        mpesaShortcode: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        mpesaCallbackUrl: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
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
        modelName: 'Branch',
        tableName: 'branches',
        hooks: {
          beforeCreate: async (branch: Branch) => {
            // Encrypt M-Pesa credentials
            if (branch.mpesaConsumerKey) {
              branch.mpesaConsumerKey = encrypt(branch.mpesaConsumerKey);
            }
            if (branch.mpesaConsumerSecret) {
              branch.mpesaConsumerSecret = encrypt(branch.mpesaConsumerSecret);
            }
            if (branch.mpesaPasskey) {
              branch.mpesaPasskey = encrypt(branch.mpesaPasskey);
            }
            // Generate callback URL
            branch.mpesaCallbackUrl = branch.generateCallbackUrl();
          },
          beforeUpdate: async (branch: Branch) => {
            // Encrypt M-Pesa credentials if changed
            if (branch.changed('mpesaConsumerKey') && branch.mpesaConsumerKey) {
              branch.mpesaConsumerKey = encrypt(branch.mpesaConsumerKey);
            }
            if (branch.changed('mpesaConsumerSecret') && branch.mpesaConsumerSecret) {
              branch.mpesaConsumerSecret = encrypt(branch.mpesaConsumerSecret);
            }
            if (branch.changed('mpesaPasskey') && branch.mpesaPasskey) {
              branch.mpesaPasskey = encrypt(branch.mpesaPasskey);
            }
          },
        },
      }
    );
  }

  public static associate(models: any) {
    Branch.hasMany(models.User, {
      foreignKey: 'branchId',
      as: 'users',
    });
    Branch.hasMany(models.Inventory, {
      foreignKey: 'branchId',
      as: 'inventory',
    });
    Branch.hasMany(models.Sale, {
      foreignKey: 'branchId',
      as: 'sales',
    });
    Branch.hasMany(models.Payment, {
      foreignKey: 'branchId',
      as: 'payments',
    });
  }
}

export default Branch;