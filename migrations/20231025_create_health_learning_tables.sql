```sql
CREATE TABLE health_learning_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  profile_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wearable_integrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  provider VARCHAR(255),
  integration_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  preferences JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE data_contributions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  contribution_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_models (
  id SERIAL PRIMARY KEY,
  model_data BYTEA,
  model_metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE optimization_marketplace (
  id SERIAL PRIMARY KEY,
  offer_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```