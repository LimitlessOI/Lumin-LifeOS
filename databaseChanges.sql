```sql
CREATE TABLE workshops (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    capacity INT NOT NULL
);

CREATE TABLE workshop_registrations (
    id SERIAL PRIMARY KEY,
    workshop_id INT REFERENCES workshops(id) ON DELETE CASCADE,
    user_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workshop_id, user_id)
);
```