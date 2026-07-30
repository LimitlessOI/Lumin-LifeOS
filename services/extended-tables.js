/**
 * SYNOPSIS: Exports extendTables — services/extended-tables.js.
 */
export function extendTables(knex, existingTables) {
  return Promise.all([
    knex.schema.hasTable('joy_checkins').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('joy_checkins', (table) => {
          table.increments('id').primary();
          if (existingTables.includes('users')) {
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
          } else {
            table.integer('user_id').unsigned();
          }
          table.string('mood');
          table.text('notes');
          table.timestamp('created_at').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    knex.schema.hasTable('integrity_score_log').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('integrity_score_log', (table) => {
          table.increments('id').primary();
          if (existingTables.includes('users')) {
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
          } else {
            table.integer('user_id').unsigned();
          }
          table.integer('score');
          table.timestamp('logged_at').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    knex.schema.hasTable('wearable_data').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('wearable_data', (table) => {
          table.increments('id').primary();
          if (existingTables.includes('users')) {
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
          } else {
            table.integer('user_id').unsigned();
          }
          table.string('device_id');
          table.jsonb('data_payload');
          table.timestamp('recorded_at').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    knex.schema.hasTable('emotional_patterns').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('emotional_patterns', (table) => {
          table.increments('id').primary();
          if (existingTables.includes('users')) {
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
          } else {
            table.integer('user_id').unsigned();
          }
          table.string('pattern_name');
          table.jsonb('pattern_data');
          table.timestamp('discovered_at').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    knex.schema.hasTable('extended_table_example').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('extended_table_example', (table) => {
          table.increments('id').primary();
          table.string('new_column');
          if (existingTables.includes('users')) {
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
          } else {
            table.integer('user_id').unsigned();
          }
        });
      }
      return null;
    }),
    // New table for user preferences
    knex.schema.hasTable('user_preferences').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('user_preferences', (table) => {
          table.increments('id').primary();
          if (existingTables.includes('users')) {
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE').unique();
          } else {
            table.integer('user_id').unsigned().unique();
          }
          table.jsonb('preferences_data');
          table.timestamp('updated_at').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    // New table for activity log
    knex.schema.hasTable('activity_log').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('activity_log', (table) => {
          table.increments('id').primary();
          if (existingTables.includes('users')) {
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
          } else {
            table.integer('user_id').unsigned();
          }
          table.string('activity_type');
          table.text('description');
          table.jsonb('details');
          table.timestamp('logged_at').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    // New table for notifications
    knex.schema.hasTable('notifications').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('notifications', (table) => {
          table.increments('id').primary();
          if (existingTables.includes('users')) {
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
          } else {
            table.integer('user_id').unsigned();
          }
          table.string('type');
          table.text('message');
          table.boolean('is_read').defaultTo(false);
          table.jsonb('metadata');
          table.timestamp('created_at').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
  ]);
}