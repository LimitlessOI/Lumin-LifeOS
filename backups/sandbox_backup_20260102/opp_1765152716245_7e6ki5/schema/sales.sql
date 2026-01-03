CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    productName VARCHAR(100) NOT NULL CHECK (productName ~* '^[a-zA-Z][a-zA-Z0-9_]+\b'),
    price NUMERIC(8,2) CHECK (price > 0),
    quantitySold INTEGER DEFAULT 0 CHECK (quantitySold >= 0) NOT NULL,
    userId INT REFERENCES users(id),
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);