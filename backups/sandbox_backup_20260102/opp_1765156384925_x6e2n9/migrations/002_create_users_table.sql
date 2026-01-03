BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Use bcrypt or another secure hashing algorithm for passwords.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) CHECK (price >= 0), -- Assuming prices are in dollars.
    duration INTEGER DEFAULT 360 min; -- Duration of the course expressed as minutes/hours per week for a month's timeframe.
);
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    course_id INT REFEREN0SE courses(id) ON DELETE CASCADE, -- Assume deletion of a course cascades to related data.
    status VARCHAR(255) NOT NULL CHECK (status IN ('pending', 'enrolled', 'completed')),
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP, -- Use CURRENT_DATE + duration as default for enrollment's temporal range. Default to the current date if no specific timeframe is set by user.
    completion BOOLEAN NOT NULL CHECK (completion IN ('yes', 'no')),
    CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id),
    CONSTRAINT fk_course FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE, -- Ensure to cascade delete course enrollments.
);
CREATE TABLE IF NOT EXISTS payment_records (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    amount NUMERIC(10, 2) CHECK (amount >= 0), -- Assume all transactions are positive values representing payments.
    status VARCHAR(50) DEFAULT 'pending',
    course_id INT REFERENCE courses(id),
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id),
    CONSTRAINT fk_course FOREIGN KEY(course_id) REFERENCE courses(id); -- Ensure a user can only enroll in one course at a end time.
CREATE INDEX idx_payment ON payment_records (user_id, amount DESC);
COMMIT;