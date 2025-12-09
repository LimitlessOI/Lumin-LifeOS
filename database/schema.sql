```sql
-- Collaboration table for real-time editing sessions
CREATE TABLE collaboration_sessions (
    id SERIAL PRIMARY KEY,
    document_id INT NOT NULL,
    session_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Templates table for legal document templates
CREATE TABLE legal_templates (
    id SERIAL PRIMARY KEY,
    jurisdiction VARCHAR(255),
    template_name VARCHAR(255),
    template_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compliance checks table
CREATE TABLE compliance_checks (
    id SERIAL PRIMARY KEY,
    document_id INT NOT NULL,
    compliance_status BOOLEAN,
    details JSONB,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Suggestions table
CREATE TABLE ai_suggestions (
    id SERIAL PRIMARY KEY,
    document_id INT NOT NULL,
    suggestion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document versioning table
CREATE TABLE document_versions (
    id SERIAL PRIMARY KEY,
    document_id INT NOT NULL,
    version_number INT,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Integration logs table
CREATE TABLE integration_logs (
    id SERIAL PRIMARY KEY,
    integration_type VARCHAR(255),
    request_data JSONB,
    response_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```