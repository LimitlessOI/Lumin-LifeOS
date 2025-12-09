```javascript
exports.up = async function(knex) {
  await knex.schema.createTable('users', table => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('email').unique().notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('nutrition_plans', table => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.json('plan').notNullable();
    table.timestamps(true, true);
  });

  // Add more tables as needed
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('nutrition_plans');
  await knex.schema.dropTableIfExists('users');
};
```