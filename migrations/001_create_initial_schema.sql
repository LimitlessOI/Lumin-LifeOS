```sql
CREATE TABLE vr_rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE avatars (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    avatar_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collaboration_sessions (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES vr_rooms(id),
    session_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE device_compatibility (
    id SERIAL PRIMARY KEY,
    device_name VARCHAR(255) NOT NULL,
    is_compatible BOOLEAN DEFAULT TRUE
);
```