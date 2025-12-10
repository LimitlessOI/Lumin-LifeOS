```sql
CREATE TABLE neural_devices (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE neural_sessions (
  id SERIAL PRIMARY KEY,
  device_id INT REFERENCES neural_devices(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  data JSONB NOT NULL
);

CREATE TABLE neural_marketplace (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  item_description TEXT,
  price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE capability_unlocks (
  id SERIAL PRIMARY KEY,
  device_id INT REFERENCES neural_devices(id),
  capability_name VARCHAR(255) NOT NULL,
  unlocked BOOLEAN DEFAULT FALSE
);
```