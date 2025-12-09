```sql
CREATE TABLE neural_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE neural_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES neural_users(id)
);

CREATE TABLE neural_commands (
    id SERIAL PRIMARY KEY,
    session_id INT NOT NULL,
    command VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES neural_sessions(id)
);
```