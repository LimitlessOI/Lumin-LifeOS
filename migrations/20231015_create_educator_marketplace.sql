```sql
CREATE TABLE educator_marketplace (
    educator_id INT PRIMARY KEY,
    profile_details JSONB,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```