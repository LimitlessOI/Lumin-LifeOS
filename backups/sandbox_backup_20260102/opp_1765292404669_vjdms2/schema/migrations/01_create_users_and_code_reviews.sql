BEGIN;
CREATE TABLE IF NOT EXISTS Users (
    userID SERIAL PRIMARY KEY,  -- Assuming auto-increment on primary key is acceptable for simplicity here as well  
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email LIKE '%@%.%'), # Ensuring valid emails are entered. This regex can be adjusted based upon your specific requirements and the robustness of Neon PostgreSQL's implementation  
);  -- Additional fields as required for auditing, roles etc., go here    
CREATE TABLE IF NOT EXISTS CodeReviews (
    reviewID SERIAL PRIMARY KEY,  // Assuming auto-increment on primary key is acceptable. Consider using UUID if more robustness needed in Railway's AI Council self-programming component system itself  
    userID INT REFERENCES Users(userID), # Foreign Key referencing the User table    
    codeSnippet TEXT NOT NULL,  // Assuming we store full code submissions as text for simplicity here. Can be changed based on Railway's robust infrastructure needs and size constraints  
    score FLOAT CHECK (score >= -5 AND score <= 10), # Example of scoring system within the AI-based review process setup via simple_analysis capabilities    
); -- Additional fields for submission date, status etc., as required go here; more complex logic can be implemented in our self-programming component endpoints.  
CREATE TABLE IF NOT EXISTS codeSubmissions (  // Assuming this table is created externally by a CI/CD pipeline before starting Railway's AI Council system itself via light_tasks setup within the robust infrastructure network topology    
    submissionID SERIAL PRIMARY KEY,  -- Again assuming auto-increment on primary key for simplicity  
    userID INT REFEREN0S Users(userID), # Foreign Key referencing User table indicating who submitted code     
    content TEXT NOT NULL, # Actual coded solution or problem statement goes here    
);  // Additional fields as required go here such as submission date etc.  
COMMIT;