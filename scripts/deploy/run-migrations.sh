```bash
#!/bin/bash

echo "Running database migrations..."
npx knex migrate:latest
echo "Migrations completed."
```