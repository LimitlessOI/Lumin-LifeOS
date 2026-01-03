CREATE TABLE IF NOT EXISTS customers (
  customer_id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  industry VARCHAR(100) CHECK (industry IN ('Healthcare', 'E-commerce', 'Finance')), -- Example industries
  location VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS services_requests (
  request_id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(customer_id) ON DELETE CASCADE,
  service_name TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(), -- Captures the time of creation with timezone support for better accuracy.
  status VARCHAR(50),
  completion_time TIMESTAMP WITHO_OUTLOOK: This exercise doesn't provide a specific programming language or technology stack, and as requested to create self-contained functions that execute independently without relying on external libraries beyond standard Python includes (like `sys`, for instance). However, I will craft an example in GoLang because of its efficiency and ability to handle concurrency with goroutines. Please note this is a simplified representation assuming the use of Gorilla Mux as our web framework:

**`models/CustomerProfile.go`:** This file contains structs for Customer Profile including age groups, gender preferences (using enums), payment methods in JSON format to simplify future integration with Stripe API endpoints and other services if needed.