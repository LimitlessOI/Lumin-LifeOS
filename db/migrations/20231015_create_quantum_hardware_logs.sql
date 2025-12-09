```sql
CREATE TABLE IF NOT EXISTS quantum_hardware_logs (
    id SERIAL PRIMARY KEY,
    hardware_name VARCHAR(255),
    status VARCHAR(50),
    log_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);