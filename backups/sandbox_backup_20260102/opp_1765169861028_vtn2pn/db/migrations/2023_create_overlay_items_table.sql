CREATE TABLE IF NOT EXISTS overlay_items (
    overlayID SERIAL PRIMARY KEY,
    gameTitle VARCHAR(191) NOT NULL,
    itemName VARCHAR(191) NOT NULL,
    price NUMERIC(8, 2) CHECK (price > 0) NOT NULL
);