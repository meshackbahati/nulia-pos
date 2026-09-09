import { DataTypes, Model } from 'sequelize';
import { encrypt, decrypt } from '../lib/encryption.js';

class Integration extends Model {
    getDecryptedConfig() {
        if (!this.config) return null;
        try {
            return JSON.parse(decrypt(JSON.stringify(this.config)));
        } catch {
            return this.config;
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
                    allowNull: false,
                    references: { model: 'branches', key: 'id' },
                },
                name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                provider: {
                    type: DataTypes.ENUM('quickbooks', 'zoho_books', 'sage', 'xero', 'shopify', 'woocommerce', 'custom'),
                    allowNull: false,
                },
                config: {
                    type: DataTypes.JSONB,
                    allowNull: true,
                },
                isActive: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true,
                },
                lastSyncAt: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                syncDirection: {
                    type: DataTypes.ENUM('import', 'export', 'bidirectional'),
                    defaultValue: 'export',
                },
                syncFrequency: {
                    type: DataTypes.ENUM('manual', 'hourly', 'daily'),
                    defaultValue: 'manual',
                },
                lastStatus: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
            },
            {
                sequelize,
                modelName: 'Integration',
                tableName: 'integrations',
                indexes: [
                    { fields: ['branchId'] },
                    { fields: ['provider'] },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
    }
}

export default Integration;
