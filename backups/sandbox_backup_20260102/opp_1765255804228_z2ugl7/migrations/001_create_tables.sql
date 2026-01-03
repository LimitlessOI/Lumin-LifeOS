CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(100), 
    email VARCHAR(150) UNIQUE NOT NULL,
    preferences JSONB
);

CREATE TABLE IF NOT EXISTS interactions (
    interaction_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(customer_id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    message JSONB NOT NULL -- Contains structured data from conversation with the bot and user inputs.
);

CREATE TABLE IF NOT EXISTS kb (
    question TEXT PRIMARY KEY,
    answer TEXT
);