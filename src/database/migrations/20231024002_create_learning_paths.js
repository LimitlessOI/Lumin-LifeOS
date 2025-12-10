```javascript
exports.up = function(knex) {
  return knex.schema.createTable('learning_paths', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.json('path').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('learning_paths');
};
```