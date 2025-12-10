```sql
CREATE TABLE energy_assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL,
    location GEOGRAPHY(Point)
);

CREATE TABLE energy_trades (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES energy_assets(id),
    amount DECIMAL(10, 2) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE grid_data (
    id SERIAL PRIMARY KEY,
    grid_status VARCHAR(255),
    demand INTEGER,
    supply INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE carbon_credits (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER,
    credits INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE regulatory_sandbox (
    id SERIAL PRIMARY KEY,
    rule VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```