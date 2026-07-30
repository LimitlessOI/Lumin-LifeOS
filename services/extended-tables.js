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
    // New table for user settings - to avoid schema conflicts and respect module requirements
    knex.schema.hasTable('user_settings').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('user_settings', (table) => {
          table.increments('id').primary();
          if (existingTables.includes('users')) {
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE').unique();
          } else {
            table.integer('user_id').unsigned().unique();
          }
          table.jsonb('settings_data');
          table.timestamp('last_updated').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    // New table for system logs - for module-specific logging
    knex.schema.hasTable('system_logs').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('system_logs', (table) => {
          table.increments('id').primary();
          table.string('log_level');
          table.string('module_name');
          table.text('log_message');
          table.jsonb('context_data');
          table.timestamp('logged_at').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    // New table for features flags - for module-specific feature toggles
    knex.schema.hasTable('feature_flags').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('feature_flags', (table) => {
          table.increments('id').primary();
          table.string('feature_name').unique();
          table.boolean('is_enabled').defaultTo(false);
          table.jsonb('configuration');
          table.timestamp('last_modified').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    // New table for module_configs - to manage configuration specific to different modules
    knex.schema.hasTable('module_configs').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('module_configs', (table) => {
          table.increments('id').primary();
          table.string('module_name').unique();
          table.jsonb('config_data');
          table.timestamp('last_updated').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    // New table for audit_trails - to track changes and operations within the system
    knex.schema.hasTable('audit_trails').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('audit_trails', (table) => {
          table.increments('id').primary();
          if (existingTables.includes('users')) {
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
          } else {
            table.integer('user_id').unsigned();
          }
          table.string('action_type');
          table.text('description');
          table.string('target_table');
          table.integer('target_id');
          table.jsonb('old_value');
          table.jsonb('new_value');
          table.timestamp('action_time').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    // New table for external_integrations - to store details about third-party services
    knex.schema.hasTable('external_integrations').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('external_integrations', (table) => {
          table.increments('id').primary();
          table.string('integration_name').unique();
          table.string('api_key');
          table.jsonb('config');
          table.boolean('is_active').defaultTo(false);
          table.timestamp('created_at').defaultTo(knex.fn.now());
          table.timestamp('last_updated').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    // New table for user_sessions - to manage user session data, avoiding conflicts
    knex.schema.hasTable('user_sessions').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('user_sessions', (table) => {
          table.increments('id').primary();
          if (existingTables.includes('users')) {
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
          } else {
            table.integer('user_id').unsigned();
          }
          table.string('session_token').unique();
          table.timestamp('expires_at');
          table.jsonb('session_data');
          table.timestamp('created_at').defaultTo(knex.fn.now());
          table.timestamp('last_accessed').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    // New table for data_exports - to track and manage data export operations
    knex.schema.hasTable('data_exports').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('data_exports', (table) => {
          table.increments('id').primary();
          if (existingTables.includes('users')) {
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
          } else {
            table.integer('user_id').unsigned();
          }
          table.string('export_type');
          table.string('status'); // e.g., 'pending', 'completed', 'failed'
          table.text('file_path');
          table.jsonb('export_params');
          table.timestamp('requested_at').defaultTo(knex.fn.now());
          table.timestamp('completed_at');
        });
      }
      return null;
    }),
    // New table for scheduled_tasks - to manage background or scheduled tasks
    knex.schema.hasTable('scheduled_tasks').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('scheduled_tasks', (table) => {
          table.increments('id').primary();
          table.string('task_name');
          table.string('cron_schedule');
          table.timestamp('last_run_at');
          table.timestamp('next_run_at');
          table.string('status'); // e.g., 'active', 'paused', 'error'
          table.jsonb('task_config');
          table.timestamp('created_at').defaultTo(knex.fn.now());
          table.timestamp('updated_at').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    // New table for error_monitoring - to log and track system errors
    knex.schema.hasTable('error_monitoring').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('error_monitoring', (table) => {
          table.increments('id').primary();
          table.string('error_code');
          table.string('severity');
          table.text('message');
          table.jsonb('stack_trace');
          table.jsonb('context');
          table.timestamp('logged_at').defaultTo(knex.fn.now());
          table.boolean('is_resolved').defaultTo(false);
        });
      }
      return null;
    }),
    // New table for resource_locks - for managing concurrent access to shared resources
    knex.schema.hasTable('resource_locks').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('resource_locks', (table) => {
          table.increments('id').primary();
          table.string('resource_name').unique();
          if (existingTables.includes('users')) {
            table.integer('locked_by_user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
          } else {
            table.integer('locked_by_user_id').unsigned();
          }
          table.string('lock_owner_id'); // e.g., process ID, service instance ID
          table.timestamp('locked_at').defaultTo(knex.fn.now());
          table.timestamp('expires_at');
        });
      }
      return null;
    }),
    // New table for system_metrics - to store various system performance metrics
    knex.schema.hasTable('system_metrics').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('system_metrics', (table) => {
          table.increments('id').primary();
          table.string('metric_name');
          table.float('metric_value');
          table.jsonb('metric_tags'); // e.g., { host: 'server1', region: 'us-east-1' }
          table.timestamp('recorded_at').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    // New table for content_metadata - for managing metadata for various content types
    knex.schema.hasTable('content_metadata').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('content_metadata', (table) => {
          table.increments('id').primary();
          table.string('content_type'); // e.g., 'article', 'image', 'video'
          table.integer('content_id'); // ID of the actual content in its respective table
          table.jsonb('metadata_fields');
          table.timestamp('created_at').defaultTo(knex.fn.now());
          table.timestamp('last_updated').defaultTo(knex.fn.now());
          table.unique(['content_type', 'content_id']); // Ensure uniqueness per content item
        });
      }
      return null;
    }),
    // New table for webhooks - to configure and manage outgoing webhooks
    knex.schema.hasTable('webhooks').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('webhooks', (table) => {
          table.increments('id').primary();
          table.string('event_type'); // e.g., 'user_created', 'order_updated'
          table.string('target_url');
          table.string('secret_token');
          table.boolean('is_active').defaultTo(true);
          table.jsonb('config_params');
          table.timestamp('created_at').defaultTo(knex.fn.now());
          table.timestamp('last_updated').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    // New table for email_templates - to store email template content
    knex.schema.hasTable('email_templates').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('email_templates', (table) => {
          table.increments('id').primary();
          table.string('template_name').unique();
          table.string('subject');
          table.text('body_html');
          table.text('body_text');
          table.jsonb('variables'); // Default variables for the template
          table.timestamp('created_at').defaultTo(knex.fn.now());
          table.timestamp('last_updated').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    // New table for search_indices - to manage search index configurations
    knex.schema.hasTable('search_indices').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('search_indices', (table) => {
          table.increments('id').primary();
          table.string('index_name').unique();
          table.string('target_table');
          table.jsonb('indexed_fields');
          table.string('strategy'); // e.g., 'full_text', 'keyword'
          table.boolean('is_active').defaultTo(true);
          table.timestamp('last_reindexed_at');
          table.timestamp('created_at').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
  ]);
}