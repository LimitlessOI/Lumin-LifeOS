-- File: migrations/2018_11_16_17_35_create_table_scenarios.sql -- Generated timestamp for when the migration was created (replace with current date and time)
CREATE TABLE IF NOT EXISTS scenarios (
    scenario_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id),
    make_com_url TEXT NOT NULL,
    status ENUM('pending', 'in progress', 'completed') DEFAULT 'pending' -- Status of the Make.com scenario;
);
   CREATE TABLE IF NOT EXISTS automations (
    automation_id SERIAL PRIMARY KEY,
    scenario_id INT REFERENCES Scenarios(scenario_id),
    steps TEXT NOT NULL -- JSON formatted list of actions or tasks to be performed by the Make.com platform 
);
   CREATE TABLE IF NOT EXISTS revenues (
    revenue_id SERIAL PRIMARY KEY,
    scenario_id INT REFERENCES Scenarios(scenario_id),
    amount NUMERIC NOT NULL CHECK (amount > 0Dj87421aRKG3TqJWzrMHmNZB6;com/api/v1/system/self-program -- API endpoint for creating new scenarios and initiating automation workflows via Make.com integration, expected input JSON with user details, scenario description, etc.;
    status ENUM('confirmed', 'pending') DEFAULT 'pending' -- Status of the revenue capture process;
);