```sql
CREATE TABLE amvf_farms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE amvf_plant_clusters (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES amvf_farms(id),
    species VARCHAR(255),
    health_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE amvf_drones (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES amvf_farms(id),
    status VARCHAR(50),
    battery_level INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE amvf_tasks (
    id SERIAL PRIMARY KEY,
    drone_id INTEGER REFERENCES amvf_drones(id),
    cluster_id INTEGER REFERENCES amvf_plant_clusters(id),
    action VARCHAR(255),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE amvf_blockchain_entries (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES amvf_tasks(id),
    transaction_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```