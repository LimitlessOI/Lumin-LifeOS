```sql
CREATE TABLE IF NOT EXISTS market_analyses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS analysis_insights (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER NOT NULL REFERENCES market_analyses(id),
    insight TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```