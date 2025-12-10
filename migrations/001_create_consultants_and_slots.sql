CREATE TABLE consultants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  expertise TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE consultation_slots (
  id SERIAL PRIMARY KEY,
  consultant_id INT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (consultant_id) REFERENCES consultants(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  slot_id INT NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  FOREIGN KEY (slot_id) REFERENCES consultation_slots(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);