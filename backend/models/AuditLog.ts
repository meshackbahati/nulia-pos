import { DataTypes, Model, Sequelize } from 'sequelize';

export interface AuditLogAttributes {
  id: string;
  userId?: string;
  branchId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: Date;
}

class AuditLog extends Model<AuditLogAttributes> implements AuditLogAttributes {
  public id!: string;
  public userId?: string;
  public branchId?: string;
  public action!: string;
  public resource!: string;
  public resourceId?: string;
  public oldValues?: any;
  public newValues?: any;
  public ipAddress?: string;
  public userAgent?: string;
  public metadata?: any;
  public readonly createdAt!: Date;

  public static init(sequelize: Sequelize) {
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
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'AuditLog',
        tableName: 'audit_logs',
        updatedAt: false, // Audit logs are immutable
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

  public static associate(models: any) {
    AuditLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    AuditLog.belongsTo(models.Branch, {
      foreignKey: 'branchId',
      as: 'branch',
    });
  }
}

export default AuditLog;