exports.up = function(knex) {
  return knex.schema.createTable('enrollments', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('course_id').unsigned().notNullable();
    table.timestamp('enrolled_at').defaultTo(knex.fn.now());
    table.decimal('price', 10, 2).notNullable();
    table.string('status').notNullable().defaultTo('pending');

    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.foreign('course_id').references('courses.id').onDelete('CASCADE');

    table.unique(['user_id', 'course_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('enrollments');
};