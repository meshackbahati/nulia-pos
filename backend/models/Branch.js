import { DataTypes, Model } from 'sequelize';
import { encrypt, decrypt } from '../lib/encryption.js';

class Branch extends Model {
    // Instance methods
    getMpesaCredentials() {
        return {
            consumerKey: this.mpesaConsumerKey ? decrypt(this.mpesaConsumerKey) : null,
            consumerSecret: this.mpesaConsumerSecret ? decrypt(this.mpesaConsumerSecret) : null,
            passkey: this.mpesaPasskey ? decrypt(this.mpesaPasskey) : null,
            shortcode: this.mpesaShortcode,
        };
    }

    generateCallbackUrl() {
        const baseUrl = process.env.MPESA_CALLBACK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        return `${baseUrl}/branch/${this.id}/callback`;
    }

    static initialize(sequelize) {
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
                secondaryCurrency: {
                    type: DataTypes.STRING(3),
                    allowNull: true,
                },
                exchangeRate: {
                    type: DataTypes.DECIMAL(10, 4),
                    allowNull: true,
                    defaultValue: 1.0,
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
                managedBy: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id',
                    },
                },
                metadata: {
                    type: DataTypes.JSONB,
                    allowNull: true,
                },
            },
            {
                sequelize,
                modelName: 'Branch',
                tableName: 'branches',
                hooks: {
                    beforeCreate: async (branch) => {
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
                    beforeUpdate: async (branch) => {
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

    static associate(models) {
        this.hasMany(models.User, {
            foreignKey: 'branchId',
            as: 'users',
        });
        this.hasMany(models.Inventory, {
            foreignKey: 'branchId',
            as: 'inventory',
        });
        this.hasMany(models.Sale, {
            foreignKey: 'branchId',
            as: 'sales',
        });
        this.hasMany(models.Payment, {
            foreignKey: 'branchId',
            as: 'payments',
        });
    }
}

export default Branch;
