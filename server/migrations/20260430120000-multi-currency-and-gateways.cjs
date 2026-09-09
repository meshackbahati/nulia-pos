'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create ExchangeRates table
    await queryInterface.createTable('exchange_rates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'branches',
          key: 'id',
        },
      },
      fromCurrency: {
        type: Sequelize.STRING(3),
        allowNull: false,
      },
      toCurrency: {
        type: Sequelize.STRING(3),
        allowNull: false,
      },
      rate: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      }
    });

    // 2. Add Preferred Gateway fields to Branches
    await queryInterface.addColumn('branches', 'preferredGateway', {
      type: Sequelize.ENUM('mpesa', 'paystack', 'none'),
      defaultValue: 'none',
      allowNull: false,
    });
    await queryInterface.addColumn('branches', 'gatewayEnabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });

    // 3. Add Multi-Currency fields to Payments
    await queryInterface.addColumn('payments', 'paidAmount', {
      type: Sequelize.DECIMAL(18, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('payments', 'paidCurrency', {
      type: Sequelize.STRING(3),
      allowNull: true,
    });
    await queryInterface.addColumn('payments', 'exchangeRate', {
      type: Sequelize.DECIMAL(18, 6),
      allowNull: true,
    });
    await queryInterface.addColumn('payments', 'baseCurrencyAmount', {
      type: Sequelize.DECIMAL(18, 2),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('exchange_rates');
    await queryInterface.removeColumn('branches', 'preferredGateway');
    await queryInterface.removeColumn('branches', 'gatewayEnabled');
    await queryInterface.removeColumn('payments', 'paidAmount');
    await queryInterface.removeColumn('payments', 'paidCurrency');
    await queryInterface.removeColumn('payments', 'exchangeRate');
    await queryInterface.removeColumn('payments', 'baseCurrencyAmount');
    // Note: To truly remove the ENUM type in Postgres, extra steps are needed, 
    // but for this migration down is usually for full rollback.
  }
};
