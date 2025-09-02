/*
# Create Audit Logs Table

1. New Tables
  - `audit_logs`
    - `id` (uuid, primary key)
    - `userId` (uuid, foreign key to users, nullable)
    - `branchId` (uuid, foreign key to branches, nullable)
    - `action` (text, not null) - what action was performed
    - `resource` (text, not null) - what resource was affected
    - `resourceId` (text, nullable) - ID of the affected resource
    - `oldValues` (jsonb, nullable) - previous values before change
    - `newValues` (jsonb, nullable) - new values after change
    - `ipAddress` (inet, nullable) - client IP address
    - `userAgent` (text, nullable) - client user agent
    - `metadata` (jsonb, nullable) - additional context data
    - `createdAt` (timestamp, not null)

2. Indexes
  - Index on userId for user activity queries
  - Index on branchId for branch activity queries
  - Index on action for action-specific queries
  - Index on resource for resource-specific queries
  - Index on createdAt for date-based queries

3. Features
  - Immutable logs (no updatedAt field)
  - Comprehensive tracking of all system changes
  - IP and user agent tracking for security
  - Flexible metadata storage for context
*/

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      resource: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      resourceId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      oldValues: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      newValues: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      ipAddress: {
        type: Sequelize.INET,
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes
    await queryInterface.addIndex('audit_logs', ['userId']);
    await queryInterface.addIndex('audit_logs', ['branchId']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['resource']);
    await queryInterface.addIndex('audit_logs', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs');
  }
};