/**
 * SYNOPSIS: Exports extendTables — services/extended-tables.js.
 */
export function extendTables(knex, existingTables) {
  return knex.schema.createTable('extended_table_example', (table) => {
    table.increments('id').primary();
    table.string('new_column');
    // Example of referencing an existing table
    // if (existingTables.includes('users')) {
    //   table.integer('user_id').unsigned().references('id').inTable('users');
    // }
  });
}