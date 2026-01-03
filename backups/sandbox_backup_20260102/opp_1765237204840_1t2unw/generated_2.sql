-- Initial migration script to create the SaaS clone tables if they do not exist yet
CREATE TABLE IF NOT EXISTS `cloned_saas_applications` (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    -- Other necessary fields like user permissions etc. here...
);