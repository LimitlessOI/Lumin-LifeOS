```bash
# Base image with Node.js (or another supported language) runtime and buildpack-deps for building Docker images without ephemeral secrets like passwords or keys as plaintext in the Dockerfile itself.
FROM continuumio/pm2:latest AS base  # PM2 is chosen here, considering its reliability with Node.js applications but can be replaced according to actual stack preferences.

# Install dependencies and tools necessary for building our microservices from source code located at `Make_com` directory within the container. Make sure you have your package manager setup correctly in Dockerfile beforehand or use this as a placeholder command: 
RUN apt-get update && \
    apt-get install -y python3 git curl postgresql-client nodejs npm && \
    pip install --upgrade pip setuptools wheel psutil ipython matplotlib jupyter numpy pandas pytest pyyaml sphinx markdown h5py requests beautifulsoup4 flask gunicorn stripe==1.0 boto3 python-dotenv pillow && \
# Clean up unnecessary files to keep the image as lean and secure as possible: 
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /usr/share/doc/*
```