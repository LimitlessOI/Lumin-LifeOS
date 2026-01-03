CREATE TABLE code_submissions (
       id SERIAL PRIMARY KEY, 
       submission_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
       language VARCHAR(50) NOT NULL, -- Engineer's coding language specialty. REQUIRED_FIELD: true CHECK (language IN ('Python', 'Java', 'C++'))
       file BYTEA NOT NULL ENCRYPTED WITH ... , -- Encrypted binary object for the submitted code files. Required Field and Size Constraints are applied as per Neon PostgreSQL's best practices. 
       user_id INTEGER REFERENCES users(id), CHECK (user_id > 0) NOT NULL, -- Ensures a valid reference to an existing 'users' table entry for the submitting developer.
       status ENUM('pending', 'reviewing', 'completed', 'error') DEFAULT 'pending' NOT NULL,  -- Status of code review process (e.g., initial assessment or detailed comments). REQUIRED_FIELD: true
       notes TEXT COMMENT 'Optional additional remarks from engineers.'
   );   

   CREATE TABLE engineers (
       id SERIAL PRIMARY KEY, 
       name VARCHAR(100) UNIQUE NOT NULL CHECK (length(name) > 2), -- Engineer's full name. REQUIRED_FIELD: true
       expertise_area ENUM('Python', 'Java', 'C++') DEFAULT NULL COMMENT 'Engineer specialization area.' REQUIRED_FIELD: false, CHECK (expertise_area IN ('Python', 'Java', 'C++')) -- Engineer's coding language specialty.
   );   

   CREATE TABLE reviews (
       id SERIAL PRIMARY KEY, 
       code_submission_id INTEGER REFERENCES code_submissions(id),
       engineer_id INTEGER REFERENCES engineers(id), -- Engineer assigned to review the submission. Required Field: true CHECK (engineer_id > 0) NOT NULL,
       review_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp of when the code analysis began.' REQUIRED_FIELD: false, -- Timestamp for initial assessment or detailed comments.
       status ENUM('pending', 'complete') DEFAULT 'pending' NOT NULL  CHECK (status IN ('pending', 'complete')) -- Current state in review process as seen by the user and system admin roles.. REQUIRED_FIELD: true, # Status of code analysis - pending or complete.
   );   

   CREATE TABLE users (
       id SERIAL PRIMARY KEY, 
       name VARCHAR(100) NOT NULL UNIQUE CHECK (length(name) > 2), -- Name of the developer submitting a review request for their own account with email verification through JWT tokens. REQUIRED_FIELD: true # Email Validation Regular Expression and Unique Constraint to ensure no duplicates in the database,
       role ENUM('user', 'administrator') NOT NULL DEFAULT 'user' COMMENT -- Access level of user (e.g., submitter or reviewer). Required Field with a Check constraint for valid roles only: ['user'] and ('administrator').  # Role to manage access levels in the system,
       email VARCHAR(150) UNIQUE NOT NULL COMMENT -- Email validation regex '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za0-9]{2,}' to ensure that the email field contains a valid format. REQUIRED_FIELD: true CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') -- Email validation regex for email field.
   );