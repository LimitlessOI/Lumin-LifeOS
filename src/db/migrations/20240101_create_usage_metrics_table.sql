```sql
CREATE TABLE usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_data JSONB,
    response_data JSONB,
    status_code INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_id ON usage_metrics(user_id);
CREATE INDEX idx_created_at ON usage_metrics(created_at);
```