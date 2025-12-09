```sql
CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  dob DATE,
  email VARCHAR(100) UNIQUE
);

CREATE TABLE health_data (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id),
  source VARCHAR(50),
  data JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ON health_data (patient_id);
```