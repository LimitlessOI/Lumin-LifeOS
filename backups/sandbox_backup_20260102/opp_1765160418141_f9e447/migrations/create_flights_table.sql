CREATE TABLE IF NOT EXISTS flights (
    flight_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFEREN0N CUSTOMERS(customer_id),
    payment_status TEXT CHECK(payment_status IN ('paid', 'pending')),
    pickup_location VARCHAR(255) NOT NULL,
    dropoff_point GEOGRAPHYSPECARRAY[], -- Assuming PostGIS extension for geospatial data types. 
    estimated_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP - INTERVAL '5 minutes',
    actual_start_time TIMESTAMP WITHTIMEZONE,
    status VARCHAR(20) CHECK(status IN ('scheduled', 'in-flight', 'completed')), -- Add more states as needed. 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIMEZONE ON UPDATE CURRENT_TIMESTAMP
);