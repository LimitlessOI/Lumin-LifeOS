```sql
CREATE TABLE consumer_engagements (
    id SERIAL PRIMARY KEY,
    consumer_id UUID NOT NULL,
    engagement_type VARCHAR(255),
    engagement_time TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('consumer_engagements', 'engagement_time');
```