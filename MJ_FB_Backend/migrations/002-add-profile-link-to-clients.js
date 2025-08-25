exports.up = pgm => {
  pgm.addColumn('clients', {
    profile_link: { type: 'text' }
  });
  pgm.sql("UPDATE clients SET profile_link = 'https://portal.link2feed.ca/org/1605/intake/' || client_id");
  pgm.alterColumn('clients', 'profile_link', { notNull: true });
};

exports.down = pgm => {
  pgm.dropColumn('clients', 'profile_link');
};
