CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY, 
    name VARCHAR(255), 
    email VARCHAR(255) UNIQUE
);

CREATE TABLE IF NOT EXISTS scenarios (
    scenario_id SERIAL PRIMARY KEY, 
    title VARCHAR(255) NOT NULL, 
    description TEXT, 
    complexity_level INT CHECK (complexity_level >= 1), 
    category VARCHAR(255),
    user_ids INTEGER[] -- Assuming a many-to-many relationship with users. Needs to be refactored for best practices and ORM usage like Sequelize's associations in the SQLAlch0m or similar libraries used elsewhere within this project setup. 
);

CREATE TABLE IF NOT EXISTS interactions (
    interaction_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id), -- Foreign key to Users table should be an actual reference type with proper indexing for performance and consistency in ORM usage like Sequelize's association. 
    scenario_id INT REFERENCES scenarios(scenario_id) ON DELETE CASCADE, -- Assuming we want a cascading delete on removing the associated Scenario record to maintain referential integrity; otherwise use `ON DELETE SET NULL`.
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    success BOOLEAN NOT NULL CHECK (success IN (true, false)) -- This column represents interaction status. Could also be modeled as an enum for cleaner representation if only two possible values exist within the domain logic of your application; otherwise using boolean is sufficient and in line with SQL standards.
);