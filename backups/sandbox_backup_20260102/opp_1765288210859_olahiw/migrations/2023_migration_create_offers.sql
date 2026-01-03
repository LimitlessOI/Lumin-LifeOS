BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS Offers (
    OfferID SERIAL PRIMARY KEY,
    Title VARCHAR(100),
    Description TEXT,
    PricePoint DECIMAL(10, 2), -- assuming price can have cents e.g., $99.99 for two decimal places precision and up to a max value of double-digit thousands (to avoid overflows)
    Duration VARCHAR(30), -- Representing the duration as 'Xd' where X is days, eg: "7d" or using proper date fields would be more efficient in production but complies with given instructions.
    CONSTRAINT unique_offer UNIQUE (Title, PricePoint)
);
COMMIT;