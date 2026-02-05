import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';

class User extends Model {
    // Instance methods
    async validatePassword(password) {
        return bcrypt.compare(password, this.password);
    }

    getFullName() {
        return `${this.firstName} ${this.lastName}`;
    }

    // Static methods
    static async hashPassword(password) {
        return bcrypt.hash(password, 12);
    }

    static initialize(sequelize) {
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
                createdBy: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id',
                    }
                },
                lastLoginAt: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
            },
            {
                sequelize,
                modelName: 'User',
                tableName: 'users',
                hooks: {
                    beforeCreate: async (user) => {
                        if (user.password) {
                            user.password = await User.hashPassword(user.password);
                        }
                    },
                    beforeUpdate: async (user) => {
                        if (user.changed('password')) {
                            user.password = await User.hashPassword(user.password);
                        }
                    },
                },
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, {
            foreignKey: 'branchId',
            as: 'branch',
        });
        this.hasMany(models.Sale, {
            foreignKey: 'userId',
            as: 'sales',
        });
        this.hasMany(models.AuditLog, {
            foreignKey: 'userId',
            as: 'auditLogs',
        });
        this.belongsTo(models.User, {
            foreignKey: 'createdBy',
            as: 'creator',
        });
    }
}

export default User;
