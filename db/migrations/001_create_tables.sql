```sql
CREATE TABLE user_genetic_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    genetic_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_biomarkers (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    biomarker_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nutrition_plans (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    plan_details JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clinician_assignments (
    id SERIAL PRIMARY KEY,
    clinician_id INT NOT NULL,
    user_id INT NOT NULL,
    assignment_details JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);