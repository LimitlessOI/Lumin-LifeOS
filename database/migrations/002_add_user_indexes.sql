-- SYNOPSIS: SQL — 002_add_user_indexes.sql.
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);