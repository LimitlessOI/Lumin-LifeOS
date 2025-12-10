CREATE TABLE urban_deliveries (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES urban_farms(id),
    delivery_date DATE NOT NULL,
    recipient_type VARCHAR(50) NOT NULL,
    produce_type VARCHAR(100) NOT NULL,
    quantity_kg DECIMAL(10, 2) NOT NULL,
    stripe_charge_id VARCHAR(255),
    delivery_status VARCHAR(50) NOT NULL
);