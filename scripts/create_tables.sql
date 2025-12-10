```sql
CREATE TABLE learning_patterns (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    pattern_data BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE competency_graph (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    graph_data BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_data BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE adaptive_content (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    content_data BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```