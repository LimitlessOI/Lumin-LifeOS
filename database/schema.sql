```sql
-- Table for industrial assets
CREATE TABLE industrial_assets (
    asset_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    location VARCHAR(255),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for asset contracts
CREATE TABLE asset_contracts (
    contract_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES industrial_assets(asset_id),
    contract_details JSONB,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for federated models
CREATE TABLE federated_models (
    model_id SERIAL PRIMARY KEY,
    version VARCHAR(20),
    model_data BYTEA,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for resource negotiations
CREATE TABLE resource_negotiations (
    negotiation_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES industrial_assets(asset_id),
    resource_details JSONB,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```