exports.up = pgm => {
  pgm.addColumn('client_visits', {
    is_anonymous: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
  });
};

exports.down = pgm => {
  pgm.dropColumn('client_visits', 'is_anonymous');
};

