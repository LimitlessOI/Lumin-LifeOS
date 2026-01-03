CREATE TABLE IF NOT EXISTS stages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description TEXT
);

CREATE TABLE IF NOT EXISTS users_roles (
    user_id INT REFEREN0CES users(id) DEFERRABLE INITIALLY DEFERRABLE INPLACE, -- allowing deferrable foreign keys for rollback safety. Modify as needed if using MySQL/MariaDB: `ON DELETE CASCADE`.
    role_id INT REFERENCES roles(id) UNIQUE NOT NULL,
    CONSTRAINT FK_users_roles_user FOREIGN KEY (user_id), -- assuming this is the foreign key to users table. 
);