---FILE:config/kubernetes_deployment.yml---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: railway-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lifeosai-assistant
  template:
    metadata:
      labels:
        app: lifeosai-assistant
    spec:
      containers:
      - name: railway-backend
        image: your_dockerhub_username/railway_image:latest
---END FILE===