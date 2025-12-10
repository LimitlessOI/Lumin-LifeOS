```sql
CREATE TABLE microgrid_nodes (
    id SERIAL PRIMARY KEY,
    node_id VARCHAR(255) UNIQUE NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    node_id INTEGER REFERENCES microgrid_nodes(id),
    amount DECIMAL(10, 2),
    transaction_type VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE optimization_schedules (
    id SERIAL PRIMARY KEY,
    schedule_id VARCHAR(255) UNIQUE NOT NULL,
    node_id INTEGER REFERENCES microgrid_nodes(id),
    optimization_parameters JSONB,
    scheduled_time TIMESTAMP
);

CREATE TABLE resilience_subscriptions (
    id SERIAL PRIMARY KEY,
    subscription_id VARCHAR(255) UNIQUE NOT NULL,
    node_id INTEGER REFERENCES microgrid_nodes(id),
    subscription_type VARCHAR(50),
    start_date TIMESTAMP,
    end_date TIMESTAMP
);

CREATE TABLE partner_installers (
    id SERIAL PRIMARY KEY,
    installer_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    contact_information JSONB,
    service_region VARCHAR(255)
);