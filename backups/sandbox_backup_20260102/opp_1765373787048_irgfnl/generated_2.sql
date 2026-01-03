CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, -- Using a primary key that auto-increments for each new user record in PostgreSQL with Neon extension library support as assumed based on Rails background context provided by the original document 
    name VARCHAR(255) NOT NULL,
    age INTEGER CHECK (age > 0 AND age <= 120), -- Assuming a reasonable constraint for ages to promote realistic profiles within professional learning platforms. This is an example and could be adjusted based on specific use case needs as indicated in the original plan document provided by user Phi-3 Mini
    industry_background VARCHAR(255) NOT NULL,
    subscription_status BOOLEAN DEFAULT FALSE -- Default status set to false upon new account creation. This implies that users are not subscribed until they choose otherwise and fits within LifeOS policies for consent before billing 
);