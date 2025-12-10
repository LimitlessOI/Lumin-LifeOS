```sql
CREATE TABLE vr_therapy_sessions (
    session_id SERIAL PRIMARY KEY,
    therapist_id INT NOT NULL,
    environment_id INT NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    FOREIGN KEY (therapist_id) REFERENCES therapists(therapist_id),
    FOREIGN KEY (environment_id) REFERENCES vr_environment_templates(environment_id)
);

CREATE TABLE therapist_assignments (
    assignment_id SERIAL PRIMARY KEY,
    therapist_id INT NOT NULL,
    session_id INT NOT NULL,
    FOREIGN KEY (therapist_id) REFERENCES therapists(therapist_id),
    FOREIGN KEY (session_id) REFERENCES vr_therapy_sessions(session_id)
);

CREATE TABLE peer_groups (
    group_id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description TEXT
);

CREATE TABLE vr_environment_templates (
    environment_id SERIAL PRIMARY KEY,
    template_name VARCHAR(255),
    description TEXT
);
```