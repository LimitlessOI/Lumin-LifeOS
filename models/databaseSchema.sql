```sql
CREATE TABLE amtm_vehicles (
    id SERIAL PRIMARY KEY,
    status VARCHAR(50),
    location GEOGRAPHY(POINT, 4326),
    battery_level FLOAT
);

CREATE TABLE amtm_meshes (
    id SERIAL PRIMARY KEY,
    area GEOGRAPHY(POLYGON, 4326),
    efficiency_score FLOAT
);

CREATE TABLE amtm_demand_predictions (
    id SERIAL PRIMARY KEY,
    region GEOGRAPHY(POLYGON, 4326),
    demand_score FLOAT,
    prediction_time TIMESTAMP
);

CREATE TABLE amtm_infrastructure (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50),
    location GEOGRAPHY(POINT, 4326),
    energy_status FLOAT
);
```