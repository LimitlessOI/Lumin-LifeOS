```sql
CREATE TABLE identity_users (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE identity_verifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES identity_users(id),
    verification_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE identity_consents (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES identity_users(id),
    consent_given BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```