```sql
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE course_modules (
    id SERIAL PRIMARY KEY,
    course_id INT REFERENCES courses(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_course_enrollments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT REFERENCES courses(id),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE course_analytics (
    id SERIAL PRIMARY KEY,
    course_id INT REFERENCES courses(id),
    views INT DEFAULT 0,
    completions INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```