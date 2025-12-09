```sql
CREATE TABLE energy_assets (
    id SERIAL PRIMARY KEY,
    asset_name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    capacity DECIMAL NOT NULL,
    owner_id INT NOT NULL,
    location VARCHAR(255)
);

CREATE TABLE microtransactions (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES energy_assets(id),
    amount DECIMAL NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL
);

CREATE TABLE grid_predictions (
    id SERIAL PRIMARY KEY,
    prediction_date DATE NOT NULL,
    predicted_demand DECIMAL NOT NULL,
    predicted_supply DECIMAL NOT NULL
);

CREATE TABLE consumer_portfolios (
    id SERIAL PRIMARY KEY,
    consumer_id INT NOT NULL,
    portfolio_value DECIMAL NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```