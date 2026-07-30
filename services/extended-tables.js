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
    knex.schema.hasTable('module_health_checks').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('module_health_checks', (table) => {
          table.increments('id').primary();
          table.string('module_name').unique();
          table.string('status'); // e.g., 'healthy', 'unhealthy', 'degraded'
          table.jsonb('details');
          table.timestamp('last_checked_at').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    knex.schema.hasTable('api_keys').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('api_keys', (table) => {
          table.increments('id').primary();
          table.string('key_hash').unique();
          table.string('key_name');
          if (existingTables.includes('users')) {
            table.integer('created_by_user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
          } else {
            table.integer('created_by_user_id').unsigned();
          }
          table.jsonb('permissions');
          table.boolean('is_active').defaultTo(true);
          table.timestamp('created_at').defaultTo(knex.fn.now());
          table.timestamp('expires_at');
          table.timestamp('last_used_at');
        });
      }
      return null;
    }),
    knex.schema.hasTable('webhooks').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('webhooks', (table) => {
          table.increments('id').primary();
          table.string('event_type');
          table.string('callback_url');
          if (existingTables.includes('users')) {
            table.integer('created_by_user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
          } else {
            table.integer('created_by_user_id').unsigned();
          }
          table.jsonb('config');
          table.boolean('is_active').defaultTo(true);
          table.timestamp('created_at').defaultTo(knex.fn.now());
          table.timestamp('last_triggered_at');
        });
      }
      return null;
    }),
    knex.schema.hasTable('message_queue_jobs').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('message_queue_jobs', (table) => {
          table.increments('id').primary();
          table.string('job_type');
          table.string('status'); // e.g., 'pending', 'processing', 'completed', 'failed'
          table.jsonb('payload');
          table.integer('attempts').defaultTo(0);
          table.text('error_message');
          table.timestamp('created_at').defaultTo(knex.fn.now());
          table.timestamp('processed_at');
          table.timestamp('scheduled_for');
        });
      }
      return null;
    }),
    knex.schema.hasTable('system_metrics').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('system_metrics', (table) => {
          table.increments('id').primary();
          table.string('metric_name');
          table.decimal('metric_value', 14, 4);
          table.jsonb('metadata');
          table.timestamp('recorded_at').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    knex.schema.hasTable('tenant_configs').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('tenant_configs', (table) => {
          table.increments('id').primary();
          table.string('tenant_id').unique();
          table.jsonb('configuration');
          table.timestamp('created_at').defaultTo(knex.fn.now());
          table.timestamp('last_updated').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    knex.schema.hasTable('asset_management').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('asset_management', (table) => {
          table.increments('id').primary();
          table.string('asset_name');
          table.string('asset_type');
          table.string('storage_path');
          if (existingTables.includes('users')) {
            table.integer('uploaded_by_user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
          } else {
            table.integer('uploaded_by_user_id').unsigned();
          }
          table.jsonb('metadata');
          table.timestamp('uploaded_at').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
    knex.schema.hasTable('rate_limits').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('rate_limits', (table) => {
          table.increments('id').primary();
          table.string('resource_identifier').unique(); // e.g., IP address, API key, user ID
          table.integer('request_count').defaultTo(0);
          table.integer('limit_per_period');
          table.string('period_unit'); // e.g., 'minute', 'hour', 'day'
          table.timestamp('reset_at');
          table.timestamp('last_accessed_at').defaultTo(knex.fn.now());
        });
      }
      return null;
    }),
  ]);
}