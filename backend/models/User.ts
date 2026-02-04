import { DataTypes, Model, Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';

export interface UserAttributes {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'head_of_sales' | 'salesperson';
  branchId?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

class User extends Model<UserAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password!: string;
  public firstName!: string;
  public lastName!: string;
  public role!: 'admin' | 'manager' | 'head_of_sales' | 'salesperson';
  public branchId?: string;
  public isActive!: boolean;
  public lastLoginAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // Static methods
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  public static init(sequelize: Sequelize) {
    return super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          validate: {
            isEmail: true,
          },
        },
        password: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [8, 255],
          },
        },
        firstName: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [1, 100],
          },
        },
        lastName: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [1, 100],
          },
        },
        role: {
          type: DataTypes.ENUM('admin', 'manager', 'head_of_sales', 'salesperson'),
          allowNull: false,
          defaultValue: 'salesperson',
        },
        branchId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'branches',
            key: 'id',
          },
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
        lastLoginAt: {
          type: DataTypes.DATE,
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
        modelName: 'User',
        tableName: 'users',
        hooks: {
          beforeCreate: async (user: User) => {
            if (user.password) {
              user.password = await User.hashPassword(user.password);
            }
          },
          beforeUpdate: async (user: User) => {
            if (user.changed('password')) {
              user.password = await User.hashPassword(user.password);
            }
          },
        },
      }
    );
  }

  public static associate(models: any) {
    User.belongsTo(models.Branch, {
      foreignKey: 'branchId',
      as: 'branch',
    });
    User.hasMany(models.Sale, {
      foreignKey: 'userId',
      as: 'sales',
    });
    User.hasMany(models.AuditLog, {
      foreignKey: 'userId',
      as: 'auditLogs',
    });
  }
}

export default User;