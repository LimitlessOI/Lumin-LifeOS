-- SYNOPSIS: SQL — 20240101000001_add_users_initial_data.sql.
```sql
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@example.com', 'hashedpassword', 'admin');
```