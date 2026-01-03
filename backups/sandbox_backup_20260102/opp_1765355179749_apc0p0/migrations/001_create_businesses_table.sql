```sql
CREATE TABLE IF NOT EXISTS businesses (
    business_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(255),
    description TEXT
);
```