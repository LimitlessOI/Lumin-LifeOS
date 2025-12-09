```dockerfile
# Use Node.js as the base image
FROM node:16

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the service port
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
```