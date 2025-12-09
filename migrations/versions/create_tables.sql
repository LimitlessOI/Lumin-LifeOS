CREATE TABLE market_regime_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE regime_detection_results (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES market_regime_models(id),
    result_data JSONB,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE paper_trading_sessions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER,
    session_details JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE institutional_clients (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    contact_info JSONB,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);