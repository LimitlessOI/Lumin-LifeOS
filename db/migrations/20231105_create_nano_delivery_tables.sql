```sql
-- Create nano_carriers table
CREATE TABLE nano_carriers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    design_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create treatment_protocols table
CREATE TABLE treatment_protocols (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    protocol_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create delivery_logs table
CREATE TABLE delivery_logs (
    id SERIAL PRIMARY KEY,
    nano_carrier_id INT REFERENCES nano_carriers(id),
    log_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create biomarker_library table
CREATE TABLE biomarker_library (
    id SERIAL PRIMARY KEY,
    biomarker_name VARCHAR(255) NOT NULL,
    biomarker_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```