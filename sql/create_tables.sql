```sql
CREATE TABLE user_dashboard_preferences (
    user_id UUID PRIMARY KEY,
    preferences JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exported_reports (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    report_data JSONB NOT NULL,
    exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE market_insights_cache (
    insight_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_data JSONB NOT NULL,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```