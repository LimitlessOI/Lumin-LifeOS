-- Create the products table if it does not exist:
CREATE TABLE IF NOT EXISTS yourSchema.products (
  id SERIAL PRIMARY KEY, -- Adjust data types and constraints as needed for each field based on requirements; replace `id` accordingly to reflect actual schema naming conventions or primary keys used in PostgreSQL/Sequelize setup
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2), -- Adjust precision as needed for your use case: Decimal with two decimal places is standard for money values.
  inventory_count INTEGER DEFAULT 0 CHECK (inventory_count >= 0) NOT NULL, // Ensure positive integer stock levels; replace `yourSchema` and field names accordingly to reflect actual schema details.
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- This adds a timestamp with time zone for record creation: Adjust based on your database's timezone settings or remove if UTC is standard across the platforms you are targeting. Replace `createdAt` field name as needed to match schema conventions, such as using snake_case 'created_at'.
  // Additional fields like categoryId (FK) and more would be here...
);