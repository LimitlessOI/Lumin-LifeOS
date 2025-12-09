CREATE TABLE cognitive_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_transactions (
    id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    amount DECIMAL NOT NULL,
    transaction_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_energy_matches (
    id SERIAL PRIMARY KEY,
    task_id INT NOT NULL,
    energy_id INT NOT NULL,
    match_score DECIMAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wearable_sync_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    status VARCHAR(50),
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);