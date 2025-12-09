```sql
CREATE TABLE energy_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    balance DECIMAL(18, 8) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_transactions (
    id SERIAL PRIMARY KEY,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    price DECIMAL(18, 8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE iot_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    status VARCHAR(50) DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```