```sql
CREATE TABLE IF NOT EXISTS vr_destinations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vr_experiences (
    id SERIAL PRIMARY KEY,
    destination_id INT REFERENCES vr_destinations(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration INT, -- Duration in minutes
    price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vr_bookings (
    id SERIAL PRIMARY KEY,
    experience_id INT REFERENCES vr_experiences(id),
    user_id INT NOT NULL, -- Assume user management is handled elsewhere
    booking_time TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vr_guides (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vr_sessions (
    id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES vr_bookings(id),
    guide_id INT REFERENCES vr_guides(id),
    session_start TIMESTAMP,
    session_end TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```