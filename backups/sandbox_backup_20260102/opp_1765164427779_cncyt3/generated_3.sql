// config/k8s/deployment_yaml - Kubernetes Deployment YAML File using Helm Charts 
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-profiler-service
spec:
  replicas: 3 # Start with a small number of pods for development purposes, to be scaled up based on demand or as per the plan.
selector:
  matchLabels:
    app: user-profiler
template:
  metadata:
    labels:
      app: user-profiler
  spec:
    containers: # Define container(s) for your service here, e.g., Node.js or Python application running on top of Kubernetes environment with the necessary dependencies and configurations to execute API endpoints defined in routes/api.js file above using Express framework (or similar).
      - name: user-profiler-service
        image: mydockerhubuser/user-profiler:latest # This would be your application container, replace with actual Docker Hub or private registry repository where the app's Docker image is stored.