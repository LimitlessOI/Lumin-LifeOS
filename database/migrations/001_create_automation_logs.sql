```sql
-- Create Processes table
CREATE TABLE Processes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create AutomationLogs table
CREATE TABLE AutomationLogs (
    id SERIAL PRIMARY KEY,
    process_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (process_id) REFERENCES Processes(id) ON DELETE CASCADE
);
```