'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, UUIDV4, INTEGER, DATE } = Sequelize.DataTypes;

    await queryInterface.createTable('waitingList', {
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
      position: {
        type: INTEGER,
        allowNull: true,
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

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('waitingList');
  }
};
