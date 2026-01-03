-- File: migrations/create_user_table.sql - SQL command to create a Users table in Neon PostgreSQL for storing user details securely with anonymized email addresses using hashed fields 
CREATE TABLE IF NOT EXISTS users (
    UserId SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL UNIQUE, -- Assuming names are unique and not essential to the security of our system. In a production environment consider additional user-related attributes for authentication purposes like hashed passwords or emails that would be linked with Stripe Account Details. 
    Email VARCHAR(255),
    HashedEmail CHAR(64) UNIQUE, -- Assuming SHA-256 hashing is used to anonymize email addresses before storing them in the database for security purposes (real implementation should use a proper cryptographic hash function with salt). 
    StripeAccountDetails TEXT NOT NULL -- This field would store any relevant details from user's connection info that can be safely stored and retrieved by our system. Avoid direct credit card information storage; instead, reference via tokens or other methods as per best practices in handling financial data securely. We assume this is already encrypted/hashed before being passed to the database for security reasons during development stages only (as a placeholder).
);