INSERT INTO tasks (status, description) VALUES ('pending', 'Add income drones column');
UPDATE users SET has_income_tracking = FALSE; -- Assuming a boolean flag for tracking purposes in the users table 
ALTER TABLE services ADD COLUMN if not exists service_drones BOOLEAN DEFAULT FALSE;