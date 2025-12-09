```dockerfile
# Base image
FROM node:14-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy application code
COPY . .

# Expose application port
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]
```