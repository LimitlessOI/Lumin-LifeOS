```sql
CREATE TABLE VRSafetyCompany (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE VRScenario (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    scenario_name VARCHAR(255) NOT NULL,
    difficulty_level VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES VRSafetyCompany(id) ON DELETE CASCADE
);
```