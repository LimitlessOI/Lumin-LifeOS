```sql
CREATE TABLE user_discount_offers (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    offer_id INT NOT NULL,
    is_redeemed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (offer_id) REFERENCES offer_templates(id)
);

CREATE TABLE offer_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    discount_percentage DECIMAL(5, 2) NOT NULL,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL
);

CREATE TABLE checkout_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    payment_intent_id VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```