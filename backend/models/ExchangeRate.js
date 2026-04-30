import { DataTypes, Model } from 'sequelize';

class ExchangeRate extends Model {
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
                    allowNull: true, // Null means global rate
                    references: {
                        model: 'branches',
                        key: 'id',
                    },
                },
                fromCurrency: {
                    type: DataTypes.STRING(3),
                    allowNull: false,
                },
                toCurrency: {
                    type: DataTypes.STRING(3),
                    allowNull: false,
                },
                rate: {
                    type: DataTypes.DECIMAL(18, 6),
                    allowNull: false,
                },
                date: {
                    type: DataTypes.DATEONLY,
                    allowNull: false,
                    defaultValue: DataTypes.NOW,
                },
                isActive: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true,
                },
            },
            {
                sequelize,
                modelName: 'ExchangeRate',
                tableName: 'exchange_rates',
                indexes: [
                    {
                        fields: ['fromCurrency', 'toCurrency', 'date', 'branchId'],
                    },
                ],
            }
        );
    }

    static associate(models) {
        this.belongsTo(models.Branch, {
            foreignKey: 'branchId',
            as: 'branch',
        });
    }

    /**
     * Helper to get latest rate
     */
    static async getLatestRate(from, to, branchId = null) {
        const rate = await this.findOne({
            where: {
                fromCurrency: from,
                toCurrency: to,
                isActive: true,
                ...(branchId && { branchId }),
            },
            order: [['date', 'DESC'], ['createdAt', 'DESC']],
        });
        return rate ? parseFloat(rate.rate.toString()) : null;
    }
}

export default ExchangeRate;
