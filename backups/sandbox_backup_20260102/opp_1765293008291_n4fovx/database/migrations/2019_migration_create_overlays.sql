```sql
CREATE TABLE IF NOT EXISTS overlays (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  settings JSONB, -- Assuming a nested object to store various configurations and options.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE
);
```