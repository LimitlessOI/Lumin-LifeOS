// migrations/create_tables.sql ===START FILE===
CREATE TABLE IF NOT EXISTS Users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    industry_focus VARCHAR(255),
    age INT CHECK (age BETWEEN 18 AND 99)
);

CREATE TABLE IF NOT EXISTS Investments (
    investment_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(user_id),
    funding_amount DECIMAL CHECK (funding_amount >= 0),
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sector VARCHAR(255) NOT NULL,
    FOREIGN KEY (sector) REFERENCES InvestmentSectors(name) -- Hypothetical table for sectors of investments to be created as well.
);
===END FILE===