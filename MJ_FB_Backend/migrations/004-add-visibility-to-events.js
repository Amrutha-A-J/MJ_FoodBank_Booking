exports.up = pgm => {
  pgm.addColumns('events', {
    visible_to_volunteers: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    visible_to_clients: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
  });
};

exports.down = pgm => {
  pgm.dropColumn('events', 'visible_to_volunteers');
  pgm.dropColumn('events', 'visible_to_clients');
};
