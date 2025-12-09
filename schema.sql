CREATE TABLE digital_twins (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    model_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vr_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fit_predictions (
    id SERIAL PRIMARY KEY,
    digital_twin_id INT NOT NULL,
    prediction_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blockchain_verifications (
    id SERIAL PRIMARY KEY,
    digital_twin_id INT NOT NULL,
    verification_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE virtual_tryons (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    tryon_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
--