```sql
-- Create table for content projects
CREATE TABLE content_projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for brand DNA profiles
CREATE TABLE brand_dna_profiles (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES content_projects(id),
    name VARCHAR(255) NOT NULL,
    style JSONB,
    voice JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for content assets
CREATE TABLE content_assets (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES content_projects(id),
    asset_type VARCHAR(50),
    content JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for distribution channels
CREATE TABLE distribution_channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    config JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for performance metrics
CREATE TABLE performance_metrics (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES content_assets(id),
    metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for optimization rules
CREATE TABLE optimization_rules (
    id SERIAL PRIMARY KEY,
    rule JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```