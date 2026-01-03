```dockerfile
# Use an official Node runtime as a parent image, adjust version numbers based on current best practices and compatibility 
FROM node:14-slim AS base
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production && rm -rf /var/lib/apt/lists/* # Adjust for Python or other language dependencies if using a multi-language stack. 
# Copy over the rest of your codebase here, typically done in 'build' stages to avoid sending secrets into production image (not shown).
```