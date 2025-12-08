```sql
CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  preferences JSONB NOT NULL
);

CREATE TABLE product_recommendations (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  recommendation_score DECIMAL NOT NULL
);

CREATE TABLE ar_vr_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  session_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dynamic_pricing_logs (
  id SERIAL PRIMARY KEY,
  product_id UUID NOT NULL,
  user_id UUID NOT NULL,
  price_change DECIMAL NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```