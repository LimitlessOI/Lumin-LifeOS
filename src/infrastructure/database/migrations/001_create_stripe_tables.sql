```sql
CREATE TABLE stripe_consultancy_clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE stripe_optimization_events (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES stripe_consultancy_clients(id),
  event_type VARCHAR(50),
  event_data JSONB
);
```