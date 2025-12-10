```sql
CREATE TABLE trust_mesh_assets (
    id SERIAL PRIMARY KEY,
    asset_name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trust_mesh_verifications (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES trust_mesh_assets(id),
    verification_status VARCHAR(50) NOT NULL,
    verified_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trust_mesh_anchors (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES trust_mesh_assets(id),
    blockchain_hash VARCHAR(255) NOT NULL,
    anchored_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trust_mesh_alerts (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES trust_mesh_assets(id),
    alert_type VARCHAR(50) NOT NULL,
    alert_description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```