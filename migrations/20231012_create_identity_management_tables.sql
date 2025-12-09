```sql
CREATE TABLE identity_dids (
    id SERIAL PRIMARY KEY,
    did VARCHAR(255) UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE verification_tiers (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE zkp_proofs (
    id SERIAL PRIMARY KEY,
    did_id INT NOT NULL,
    proof_data JSONB NOT NULL,
    FOREIGN KEY (did_id) REFERENCES identity_dids(id)
);

CREATE TABLE cross_chain_resolutions (
    id SERIAL PRIMARY KEY,
    did_id INT NOT NULL,
    chain_info JSONB NOT NULL,
    FOREIGN KEY (did_id) REFERENCES identity_dids(id)
);

CREATE TABLE reputation_scores (
    id SERIAL PRIMARY KEY,
    did_id INT NOT NULL,
    score INT DEFAULT 0,
    FOREIGN KEY (did_id) REFERENCES identity_dids(id)
);

CREATE TABLE compliance_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(50) UNIQUE NOT NULL,
    details TEXT
);