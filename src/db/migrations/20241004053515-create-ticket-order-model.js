'use strict';

const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, UUIDV4, DATE } = Sequelize.DataTypes;

    await queryInterface.createTable('tickets', {
      id: {
        type: UUID,
        defaultValue: UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: UUID,
        allowNull: false,
        references: {
          model: 'users',  // Correct table name for UserModel
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      eventId: {
        type: UUID,
        allowNull: false,
        references: {
          model: 'events',  // Correct table name for EventModel
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      ticketStatus: {
        type: DataTypes.ENUM('booked', 'cancelled'), // Enum type for status
        allowNull: true, 
        defaultValue: 'booked',
      },
      createdAt: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('tickets');
  }
};