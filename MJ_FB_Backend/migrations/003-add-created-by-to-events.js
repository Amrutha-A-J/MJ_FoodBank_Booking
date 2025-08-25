exports.up = pgm => {
  pgm.addColumn('events', {
    created_by: {
      type: 'integer',
      notNull: true,
      references: 'staff',
      onDelete: 'cascade',
    },
  });
};

exports.down = pgm => {
  pgm.dropColumn('events', 'created_by');
};
