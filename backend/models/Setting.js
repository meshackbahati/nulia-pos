import { DataTypes, Model } from 'sequelize';
import { encrypt, decrypt } from '../lib/encryption.js';

class Setting extends Model {
    // Helper method to get decrypted value
    getDecryptedValue() {
        if (!this.value) return null;
        if (this.isEncrypted) {
            return decrypt(this.value);
        }
        return this.value;
    }

    // Helper method to set encrypted value
    setEncryptedValue(value, shouldEncrypt = true) {
        if (shouldEncrypt) {
            this.value = encrypt(value);
            this.isEncrypted = true;
        } else {
            this.value = value;
            this.isEncrypted = false;
        }
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
                    allowNull: true,
                },
                category: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                key: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                value: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                isEncrypted: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: false,
                },
                isActive: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true,
                },
                createdBy: {
                    type: DataTypes.UUID,
                },
                updatedBy: {
                    type: DataTypes.UUID,
                },
            },
            {
                sequelize,
                tableName: 'settings',
                timestamps: true,
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, {
            foreignKey: 'branchId',
            as: 'branch',
        });
        this.belongsTo(models.User, {
            foreignKey: 'createdBy',
            as: 'creator',
        });
    }
}

export default Setting;
