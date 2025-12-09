CREATE TABLE quantum_strategies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE market_regimes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quantum_simulations (
    id SERIAL PRIMARY KEY,
    strategy_id INT REFERENCES quantum_strategies(id),
    result JSONB,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quantum_readiness_scores (
    id SERIAL PRIMARY KEY,
    strategy_id INT REFERENCES quantum_strategies(id),
    score DECIMAL(5,2),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);