import { DataTypes, Model } from 'sequelize';

class AuditLog extends Model {
    static initialize(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                userId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id',
                    },
                },
                branchId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: {
                        model: 'branches',
                        key: 'id',
                    },
                },
                action: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    validate: {
                        len: [1, 100],
                    },
                },
                resource: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    validate: {
                        len: [1, 100],
                    },
                },
                resourceId: {
                    type: DataTypes.STRING,
                    allowNull: true,
                },
                oldValues: {
                    type: DataTypes.JSONB,
                    allowNull: true,
                },
                newValues: {
                    type: DataTypes.JSONB,
                    allowNull: true,
                },
                ipAddress: {
                    type: DataTypes.INET,
                    allowNull: true,
                },
                userAgent: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                metadata: {
                    type: DataTypes.JSONB,
                    allowNull: true,
                },
            },
            {
                sequelize,
                modelName: 'AuditLog',
                tableName: 'audit_logs',
                updatedAt: false,
                indexes: [
                    {
                        fields: ['userId'],
                    },
                    {
                        fields: ['branchId'],
                    },
                    {
                        fields: ['action'],
                    },
                    {
                        fields: ['resource'],
                    },
                    {
                        fields: ['createdAt'],
                    },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
        });
        this.belongsTo(models.Branch, {
            foreignKey: 'branchId',
            as: 'branch',
        });
    }
}

export default AuditLog;
