-- SYNOPSIS: Database migration — 20260723_lifeos_core_complete.sql.
CREATE TABLE IF NOT EXISTS lifeos_users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lifeos_goals (
    goal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES lifeos_users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    priority INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lifeos_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES lifeos_goals(goal_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES lifeos_users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'open',
    priority INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lifeos_projects (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES lifeos_users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lifeos_project_tasks (
    project_id UUID NOT NULL REFERENCES lifeos_projects(project_id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES lifeos_tasks(task_id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, task_id)
);

CREATE TABLE IF NOT EXISTS lifeos_habits (
    habit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES lifeos_users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(50) DEFAULT 'daily',
    start_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lifeos_habit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES lifeos_habits(habit_id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (habit_id, log_date)
);

CREATE TABLE IF NOT EXISTS lifeos_notes (
    note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES lifeos_users(user_id) ON DELETE CASCADE,
    title VARCHAR(255),
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lifeos_tags (
    tag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES lifeos_users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lifeos_resource_tags (
    resource_id UUID NOT NULL,
    tag_id UUID NOT NULL REFERENCES lifeos_tags(tag_id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    PRIMARY KEY (resource_id, tag_id, resource_type)
);

CREATE TABLE IF NOT EXISTS lifeos_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES lifeos_users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lifeos_reminders (
    reminder_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES lifeos_users(user_id) ON DELETE CASCADE,
    resource_id UUID NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    remind_at TIMESTAMPTZ NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lifeos_settings (
    user_id UUID PRIMARY KEY REFERENCES lifeos_users(user_id) ON DELETE CASCADE,
    setting_key VARCHAR(255) NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, setting_key)
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON lifeos_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON lifeos_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON lifeos_tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON lifeos_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON lifeos_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON lifeos_habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON lifeos_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON lifeos_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_tags_resource_id_type ON lifeos_resource_tags(resource_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON lifeos_events(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON lifeos_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON lifeos_reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON lifeos_settings(user_id);

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_lifeos_users_updated_at') THEN
        CREATE TRIGGER set_lifeos_users_updated_at
        BEFORE UPDATE ON lifeos_users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_lifeos_goals_updated_at') THEN
        CREATE TRIGGER set_lifeos_goals_updated_at
        BEFORE UPDATE ON lifeos_goals
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_lifeos_tasks_updated_at') THEN
        CREATE TRIGGER set_lifeos_tasks_updated_at
        BEFORE UPDATE ON lifeos_tasks
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_lifeos_projects_updated_at') THEN
        CREATE TRIGGER set_lifeos_projects_updated_at
        BEFORE UPDATE ON lifeos_projects
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_lifeos_habits_updated_at') THEN
        CREATE TRIGGER set_lifeos_habits_updated_at
        BEFORE UPDATE ON lifeos_habits
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_lifeos_notes_updated_at') THEN
        CREATE TRIGGER set_lifeos_notes_updated_at
        BEFORE UPDATE ON lifeos_notes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_lifeos_events_updated_at') THEN
        CREATE TRIGGER set_lifeos_events_updated_at
        BEFORE UPDATE ON lifeos_events
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_lifeos_settings_updated_at') THEN
        CREATE TRIGGER set_lifeos_settings_updated_at
        BEFORE UPDATE ON lifeos_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;