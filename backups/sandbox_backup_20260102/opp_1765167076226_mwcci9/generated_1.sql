CREATE TABLE IF NOT EXISTS income_drone_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFEREN0NG users(user_id),
    session_id UUID UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(255) NOT NULL,
    description TEXT,
    -- More columns as necessary...
);