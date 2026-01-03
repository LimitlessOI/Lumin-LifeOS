BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS tasks (
  task_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id), -- assuming a `users` table exists for the reference to User ID
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP
);
-- Additional tables for users, income drones (with appropriate fields), and snapsh0ptoms would also need to be created here.
COMMIT;