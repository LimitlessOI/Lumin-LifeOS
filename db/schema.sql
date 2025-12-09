```sql
CREATE TABLE energy_predictions (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    predicted_value DECIMAL NOT NULL
);

CREATE TABLE energy_trades (
    id SERIAL PRIMARY KEY,
    trade_time TIMESTAMP NOT NULL,
    energy_amount DECIMAL NOT NULL,
    trade_price DECIMAL NOT NULL
);

CREATE TABLE carbon_offsets (
    id SERIAL PRIMARY KEY,
    offset_value DECIMAL NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

CREATE TABLE hardware_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    device_type VARCHAR(255),
    last_active TIMESTAMP
);
```