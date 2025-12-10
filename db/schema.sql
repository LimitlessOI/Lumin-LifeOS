```sql
CREATE TABLE scenario_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scenario_components (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES scenario_templates(id),
  type VARCHAR(50),
  content JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scenario_sessions (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES scenario_templates(id),
  user_id UUID,
  session_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```