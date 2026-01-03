CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  createdAt TIMESTAMP WITH TIMEZONE DEFAULT CURRENT0.railwayapp-local/systems/campaigns/marketing_fun.json