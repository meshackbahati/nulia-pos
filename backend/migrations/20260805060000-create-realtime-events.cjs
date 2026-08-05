'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('realtime_events', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'null means global event (all branches)',
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('realtime_events', ['id']);
    await queryInterface.addIndex('realtime_events', ['type']);
    await queryInterface.addIndex('realtime_events', ['branchId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('realtime_events');
  }
};
