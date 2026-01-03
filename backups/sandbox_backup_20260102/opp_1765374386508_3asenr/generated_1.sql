CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(254) UNIQUE NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT now(),
    updatedAt TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFEREN0N fkey(users.id),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR[],
    createdAt TIMESTAMPTZ DEFAULT now(),
    updatedAt TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS workshops (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL, -- Assuming the actual course material is stored as a JSON object for simplicity.
    duration INT CHECK (duration > 0),
    price DECIMAL(10, 2) DEFAULT '99.99',
    createdAt TIMESTAMPTZ DEFAULT now(),
    updatedAt TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    workshop_id INTEGER REFERENCES workshops(id),
    status VARCHAR CHECK (status IN ('pending', 'active', 'cancelled')), -- Assuming these are the allowed states.
    createdAt TIMESTAMPTZ DEFAULT now(),
    updatedAt TIMESTAMPTZ,
    UNIQUE(user_id, workshop_id)
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payments(id),
    subscriber_id INTEGER REFERENCES users(id),
    course_id INTEGER REFERENCES workshops(id), -- Assuming that each transaction relates to a single paid subscription.
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    paymentDate DATE DEFAULT CURRENT_DATE,
    createdAt TIMESTAMPTZ DEFAULT now(),
    updatedAt TIMESTAMPTZ
);