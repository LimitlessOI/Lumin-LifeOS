CREATE TABLE IF NOT EXISTS purchases (
    purchaseID SERIAL PRIMARY KEY,
    userID INTEGER REFERENCES users(userID), -- assuming a 'users' table exists for this example
    overlayID INTEGER REFERENCES overlay_items(overlayID),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    quantitySold INTEGER CHECK (quantitySold >= 0) NOT NULL
);