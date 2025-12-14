```sql
CREATE TABLE market_data_points (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    source VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE market_analyses (
    id SERIAL PRIMARY KEY,
    data_point_id INT REFERENCES market_data_points(id),
    analysis_result JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE market_reports (
    id SERIAL PRIMARY KEY,
    analysis_id INT REFERENCES market_analyses(id),
    report_pdf BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);