```bash
#!/bin/bash

# Build and containerize the application
docker build -t financial-advisor-service .

# Push the container to Railway
railway up
```