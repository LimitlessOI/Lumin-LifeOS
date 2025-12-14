```bash
#!/bin/bash

# Update ECS service with new task definition
aws ecs update-service --cluster your-cluster-name --service business-process-service --force-new-deployment
```