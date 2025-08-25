exports.up = pgm => {
  pgm.createTable('migration_example', {
    id: 'id',
    name: { type: 'text', notNull: true }
  });
};

exports.down = pgm => {
  pgm.dropTable('migration_example');
};
