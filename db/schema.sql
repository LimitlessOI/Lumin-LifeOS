CREATE TABLE users_skills (
    user_id SERIAL PRIMARY KEY,
    skill_name VARCHAR(255) NOT NULL,
    proficiency_level INT NOT NULL
);

CREATE TABLE learning_paths (
    path_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users_skills(user_id),
    path_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_sessions (
    session_id SERIAL PRIMARY KEY,
    path_id INT NOT NULL REFERENCES learning_paths(path_id),
    session_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration INT NOT NULL
);

CREATE TABLE real_world_projects (
    project_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users_skills(user_id),
    project_name VARCHAR(255) NOT NULL,
    completion_status BOOLEAN DEFAULT FALSE
);

CREATE TABLE metacognitive_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users_skills(user_id),
    log_entry TEXT NOT NULL,
    entry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE community_benchmarks (
    benchmark_id SERIAL PRIMARY KEY,
    skill_name VARCHAR(255) NOT NULL,
    average_score FLOAT NOT NULL
);
--