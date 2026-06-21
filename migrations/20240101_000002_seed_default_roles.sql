-- SYNOPSIS: Database migration — 20240101_000002_seed_default_roles.sql.
INSERT INTO users (email, password_hash, role)
VALUES 
('admin@example.com', 'hashed_password_here', 'admin'),
('user@example.com', 'hashed_password_here', 'user');