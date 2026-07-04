import { DataTypes, Model } from 'sequelize';
import { encrypt, decrypt } from '../lib/encryption.js';

class Webhook extends Model {
    getDecryptedSecret() {
        if (!this.secret) return null;
        return decrypt(this.secret);
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
                    references: { model: 'branches', key: 'id' },
                },
                name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                url: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    validate: { isUrl: true },
                },
                events: {
                    type: DataTypes.JSONB,
                    allowNull: false,
                    defaultValue: [],
                },
                secret: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                isActive: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true,
                },
                lastTriggeredAt: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                failureCount: {
                    type: DataTypes.INTEGER,
                    defaultValue: 0,
                },
                createdBy: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'users', key: 'id' },
                },
            },
            {
                sequelize,
                modelName: 'Webhook',
                tableName: 'webhooks',
                hooks: {
                    beforeCreate: async (wh) => {
                        if (wh.secret) {
                            wh.secret = encrypt(wh.secret);
                        }
                    },
                    beforeUpdate: async (wh) => {
                        if (wh.changed('secret') && wh.secret) {
                            wh.secret = encrypt(wh.secret);
                        }
                    },
                },
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        this.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    }
}

export default Webhook;
