```sql
CREATE TABLE supply_chain_assets (
    id SERIAL PRIMARY KEY,
    asset_name VARCHAR(255),
    asset_type VARCHAR(255),
    owner_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE iot_device_registry (
    device_id SERIAL PRIMARY KEY,
    device_uuid UUID NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50)
);

CREATE TABLE blockchain_anchors (
    anchor_id SERIAL PRIMARY KEY,
    transaction_hash VARCHAR(255),
    blockchain_type VARCHAR(50),
    anchored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE anomaly_logs (
    log_id SERIAL PRIMARY KEY,
    anomaly_type VARCHAR(255),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);

CREATE TABLE cross_chain_mappings (
    mapping_id SERIAL PRIMARY KEY,
    source_chain VARCHAR(50),
    destination_chain VARCHAR(50),
    asset_id INTEGER,
    mapped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```