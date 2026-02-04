import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/lib/database';
import { encrypt, decrypt } from '@/lib/encryption';

interface SettingAttributes {
    id: string;
    branchId?: string;
    category: 'payment' | 'email' | 'storage' | 'general';
    key: string;
    value?: string;
    isEncrypted: boolean;
    isActive: boolean;
    createdBy?: string;
    updatedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface SettingCreationAttributes extends Optional<SettingAttributes, 'id' | 'isEncrypted' | 'isActive'> { }

class Setting extends Model<SettingAttributes, SettingCreationAttributes> implements SettingAttributes {
    declare id: string;
    declare branchId?: string;
    declare category: 'payment' | 'email' | 'storage' | 'general';
    declare key: string;
    declare value?: string;
    declare isEncrypted: boolean;
    declare isActive: boolean;
    declare createdBy?: string;
    declare updatedBy?: string;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    // Helper method to get decrypted value
    getDecryptedValue(): string | null {
        if (!this.value) return null;
        if (this.isEncrypted) {
            return decrypt(this.value);
        }
        return this.value;
    }

    // Helper method to set encrypted value
    setEncryptedValue(value: string, shouldEncrypt: boolean = true) {
        if (shouldEncrypt) {
            this.value = encrypt(value);
            this.isEncrypted = true;
        } else {
            this.value = value;
            this.isEncrypted = false;
        }
    }

    static init(sequelize: any): typeof Setting {
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

    static associate(models: any) {
        Setting.belongsTo(models.Branch, {
            foreignKey: 'branchId',
            as: 'branch',
        });
        Setting.belongsTo(models.User, {
            foreignKey: 'createdBy',
            as: 'creator',
        });
    }
}

export default Setting;
