```sql
CREATE TABLE user_credits (
    user_id INT PRIMARY KEY,
    credits INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```