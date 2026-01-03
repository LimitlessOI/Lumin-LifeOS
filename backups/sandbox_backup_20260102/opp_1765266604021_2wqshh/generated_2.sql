CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  order_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0) ENUM 'Pending',
  order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  price NUMERIC(10, 2),
  stock INTEGER DEFAULT 50 -- Assuming a default quantity of available items.
);

CREATE TABLE IF NOT EXISTS reviews (
  user_review_id SERIAL PRIMARY KEY,
  review_text TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5)
);