/**
 * SYNOPSIS: js — src/database/migrations/20231024004_create_skill_mirroring.js.
 */
```javascript
exports.up = function(knex) {
  return knex.schema.createTable('skill_mirroring', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.json('mirroring_data').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('skill_mirroring');
};
```