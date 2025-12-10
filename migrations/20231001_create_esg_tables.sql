```sql
CREATE TABLE esg_projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE esg_verification_data (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES esg_projects(id),
    data JSONB,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE impact_certificates (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES esg_projects(id),
    certificate_hash VARCHAR(255),
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dao_proposals (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drone_audits (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES esg_projects(id),
    audit_data JSONB,
    audit_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'scheduled'
);
```