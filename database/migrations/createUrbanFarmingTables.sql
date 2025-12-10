```sql
CREATE TABLE urban_farms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    owner_id INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE farm_sensors (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES urban_farms(id),
    type VARCHAR(100),
    data JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crop_cycles (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES urban_farms(id),
    crop_type VARCHAR(100),
    start_date DATE,
    end_date DATE,
    yield_estimate DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE marketplace_listings (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255),
    price DECIMAL(10, 2),
    quantity INT,
    farm_id INT REFERENCES urban_farms(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE yield_investments (
    id SERIAL PRIMARY KEY,
    investor_id INT REFERENCES users(id),
    farm_id INT REFERENCES urban_farms(id),
    amount DECIMAL(10, 2),
    return_rate DOUBLE PRECISION,
    investment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```