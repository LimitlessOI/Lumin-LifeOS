```sql
-- Table for storing reputation scores
CREATE TABLE dao_reputation_scores (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    score NUMERIC(10, 2) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing DAO proposals
CREATE TABLE dao_proposals (
    id SERIAL PRIMARY KEY,
    proposal_id UUID UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing DAO contributions
CREATE TABLE dao_contributions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    contribution_type VARCHAR(50) NOT NULL,
    contribution_value NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing DAO templates
CREATE TABLE dao_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(255) UNIQUE NOT NULL,
    template_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```