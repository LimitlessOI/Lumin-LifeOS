BEGIN;
CREATE TABLE users (
   id SERIAL PRIMARY KEY,
   email VARCHAR(255) UNIQUE NOT NULL,
   password_hash TEXT NOT NULL,
   personalization JSONB DEFAULT '{}'::jsonb,
   subscription BOOLEAN DEFAULT FALSE
);

CREATE TABLE offers (
   id SERIAL PRIMARY KEY,
   title VARCHAR(255) UNIQUE NOT NULL,
   description TEXT NOT NULL,
   price NUMERIC CHECK (price > 0),
   currency_code CHAR(3) DEFAULT 'USD'
);

CREATE TABLE transactions (
   id SERIAL PRIMARY KEY,
   user_id INTEGER REFERENCES users ON DELETE CASCADE,
   offer_id INTEGER REFERENCES offers ON DELETE RESTRICT,
   amount NUMERIC CHECK (amount <= price),
   timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE service_logs (
   id SERIAL PRIMARY KEY,
   user_id INTEGER REFERENCES users ON DELETE CASCADE,
   message TEXT NOT NULL,
   timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMIT;