```sql
CREATE TABLE funnel_interactions (
    id SERIAL PRIMARY KEY,
    funnel_id INT NOT NULL,
    user_id INT,
    interaction_type VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB,
    FOREIGN KEY (funnel_id) REFERENCES funnels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_funnel_interactions_funnel_id_timestamp ON funnel_interactions (funnel_id, timestamp);
```