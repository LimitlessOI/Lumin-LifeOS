-- Seed Initial Dataset (Separate script file)
BEGIN;
INSERT INTO services(title, price) VALUES ('First Service', '25.00');
INSERT INTO users(name, email, encrypted_password) SELECT * FROM generate_series(1, 3); -- for simplicity assuming we're creating three test users with unique emails and simple passwords that are then bcrypt-hashed in the UserService create method (not shown here)...
-- Repeat INSERT INTO statements as needed to seed initial data. Assume `UserService` is a custom service handling database interactions: 
COMMIT;