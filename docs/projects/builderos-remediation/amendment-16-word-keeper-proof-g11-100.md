// File: migrations/YYYYMMDDHHMMSS_create_word_user_word_tables.js
exports.up = async function(knex) {
  await knex.schema.createTable('words', function(table) {
    table.increments('id').primary();
    table.string('text', 255).notNullable().unique();
    table.string('language', 10).notNullable(); // e.g., 'en', 'es'
    table.timestamps(true, true); // Adds createdAt and updatedAt columns
  });

  await knex.schema.createTable('user_words', function(table) {
    table.increments('id').primary();
    table.integer('userId').unsigned().notNullable();
    table.integer('wordId').unsigned().notNullable();
    table.string('status', 50).notNullable().defaultTo('