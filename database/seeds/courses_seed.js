exports.seed = function(knex) {
  return knex('courses').del()
    .then(function() {
      return knex('courses').insert([
        { title: 'Node.js Basics', description: 'Learn the basics of Node.js', price: 29.99, currency: 'USD', published: true },
        { title: 'Advanced Node.js', description: 'Deep dive into Node.js', price: 49.99, currency: 'USD', published: false }
      ]);
    });
};