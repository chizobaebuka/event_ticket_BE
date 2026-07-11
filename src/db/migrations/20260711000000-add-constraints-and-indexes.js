'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Enforce event name uniqueness at the database level instead of relying
    // solely on an application-level check-then-act query (which is race-prone).
    await queryInterface.addConstraint('events', {
      fields: ['name'],
      type: 'unique',
      name: 'events_name_unique',
    });

    // Speed up "tickets booked by user for event" and cancellation lookups.
    await queryInterface.addIndex('tickets', ['eventId', 'userId'], {
      name: 'tickets_event_id_user_id_idx',
    });

    // Speed up FIFO waiting-list dequeues, which order by (eventId, position).
    await queryInterface.addIndex('waitingList', ['eventId', 'position'], {
      name: 'waiting_list_event_id_position_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('waitingList', 'waiting_list_event_id_position_idx');
    await queryInterface.removeIndex('tickets', 'tickets_event_id_user_id_idx');
    await queryInterface.removeConstraint('events', 'events_name_unique');
  },
};
