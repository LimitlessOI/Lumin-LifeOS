```sql
CREATE TABLE translation_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    subscription_status VARCHAR(50),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);