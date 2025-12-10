```sql
CREATE TABLE generated_content (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE content_requests (
    id SERIAL PRIMARY KEY,
    request_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```