```sql
CREATE TABLE energy_assets (
    id SERIAL PRIMARY KEY,
    asset_name VARCHAR(255) NOT NULL,
    owner_id INT NOT NULL,
    asset_type VARCHAR(50),
    capacity DECIMAL,
    location GEOGRAPHY(POINT, 4326)
);