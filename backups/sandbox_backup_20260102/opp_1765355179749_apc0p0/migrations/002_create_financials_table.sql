```sql
CREATE TABLE IF NOT EXISTS financials (
    financial_id SERIAL PRIMARY KEY,
    business_id INT REFERENCES businesses(business_id) ON DELETE CASCADE,
    revenue_forecast DECIMAL(19, 4),
    actual_earnings DECIMAL(19, 4),
    transaction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```