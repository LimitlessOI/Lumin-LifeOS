```bash
#!/bin/bash

# Build the Docker image
docker build -t arw-service .

# Push the Docker image to a container registry
docker tag arw-service registry.example.com/arw-service
docker push registry.example.com/arw-service

# Deploy on Railway
# Assuming Railway CLI is set up and the project is initialized
railway up
```