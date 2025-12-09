```sql
CREATE TABLE talent_candidates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    resume TEXT,
    portfolio_url VARCHAR(255),
    communication_sample TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidate_evaluations (
    id SERIAL PRIMARY KEY,
    candidate_id INT REFERENCES talent_candidates(id),
    evaluation_score DECIMAL(5, 2),
    feedback TEXT,
    evaluator_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_simulations (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE simulation_results (
    id SERIAL PRIMARY KEY,
    simulation_id INT REFERENCES role_simulations(id),
    candidate_id INT REFERENCES talent_candidates(id),
    result_score DECIMAL(5, 2),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feedback_loops (
    id SERIAL PRIMARY KEY,
    candidate_id INT REFERENCES talent_candidates(id),
    feedback TEXT,
    outcome TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bias_audit_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50),
    entity_id INT,
    bias_detected BOOLEAN,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);