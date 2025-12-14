```sql
CREATE TABLE market_analyses (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    insights JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_market_analyses_user_id ON market_analyses(user_id);
CREATE INDEX idx_market_analyses_insights ON market_analyses USING GIN(insights);
```