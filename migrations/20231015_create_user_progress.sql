```sql
CREATE TABLE user_progress (
    user_id INT NOT NULL,
    module_id INT NOT NULL,
    progress_percentage INT CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_accessed TIMESTAMP,
    PRIMARY KEY (user_id, module_id),
    FOREIGN KEY (module_id) REFERENCES learning_modules(id)
);
```