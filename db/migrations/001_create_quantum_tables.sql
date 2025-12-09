```sql
CREATE TABLE IF NOT EXISTS quantum_portfolio_optimizations (
  id SERIAL PRIMARY KEY,
  portfolio_data JSONB NOT NULL,
  optimization_results JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anomaly_detections (
  id SERIAL PRIMARY KEY,
  detection_data JSONB NOT NULL,
  anomaly_details JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ethical_boundary_logs (
  id SERIAL PRIMARY KEY,
  check_data JSONB NOT NULL,
  result BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS governance_audit (
  id SERIAL PRIMARY KEY,
  audit_details JSONB NOT NULL,
  compliance_status BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);