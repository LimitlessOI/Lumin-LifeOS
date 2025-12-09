```sql
CREATE TABLE vr_experiences (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_vr_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    vr_experience_id INT NOT NULL,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    FOREIGN KEY (vr_experience_id) REFERENCES vr_experiences(id)
);

CREATE TABLE vr_social_sessions (
    id SERIAL PRIMARY KEY,
    session_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES user_vr_sessions(id)
);

CREATE TABLE virtual_souvenirs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE haptic_devices (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    device_name VARCHAR(255),
    last_connected TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```