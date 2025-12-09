```sql
CREATE TABLE spatial_designs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE spatial_products (
    id SERIAL PRIMARY KEY,
    design_id INT REFERENCES spatial_designs(id),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE spatial_showrooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE revenue_shares (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES spatial_products(id),
    share_percentage DECIMAL(5, 2) NOT NULL CHECK (share_percentage >= 0 AND share_percentage <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```