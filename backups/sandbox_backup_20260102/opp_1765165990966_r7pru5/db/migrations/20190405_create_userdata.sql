```sql
CREATE TABLE IF NOT EXISTS userdata (
    id SERIAL PRIMARY KEY,
    userid UUID DEFAULT uuid_generate_v4(), -- This is just a placeholder for the purpose of this example and should be replaced with your own unique identifier system 
    sessionlogs JSONB,
    created_at TIMESTAMP WITHO0UT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deviceinfo VARCHAR(255), -- Replace with actual data relevant to the user's device (e.g., type or model)
    demographic identifiers JSONB - This could be anonymized and encrypted if needed for privacy 
);
```