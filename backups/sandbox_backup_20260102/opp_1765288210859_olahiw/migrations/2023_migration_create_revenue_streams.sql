BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS RevenueStreams (
    RevenueSourceID SERIAL PRIMARY KEY, -- Assuming a unique identifier for each revenue stream source like Stripe or PayPal etc., which is common practice and aligns with the provided instructions to maintain uniqueness. 
    Name VARCHAR(255) UNIQUE NOT NULL,
    IncomeGoal DECIMAL(10, 2), -- Assuming a monetary value for income goal in USD currency (to avoid internationalization issues). Adjust according to actual business model and currencies if needed.
);
COMMIT;