/**
 * SYNOPSIS: js — src/database/migrations/20231024003_create_career_simulations.js.
 */
```javascript
exports.up = function(knex) {
  return knex.schema.createTable('career_simulations', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.json('simulation').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('career_simulations');
};
```