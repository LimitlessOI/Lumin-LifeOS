```sql
-- Add new columns to the users table
ALTER TABLE users
ADD COLUMN subscription_status VARCHAR(50),
ADD COLUMN subscription_expiry DATE;

-- Create market_reports table
CREATE TABLE market_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    report_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```