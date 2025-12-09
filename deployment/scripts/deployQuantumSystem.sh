```bash
#!/bin/bash

echo "Starting deployment of Quantum System..."

# Install dependencies
npm install

# Run database migrations
echo "Running database migrations..."
psql -U $POSTGRES_USER -d $POSTGRES_DB -a -f database/migrations/001_create_quantum_tables.sql

# Start the application
echo "Starting the application..."
node src/index.js

echo "Deployment completed successfully!"
```