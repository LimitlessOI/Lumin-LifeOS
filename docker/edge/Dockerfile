```dockerfile
# Use an official Node.js runtime as a parent image
FROM node:14-alpine

# Set the working directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Define environment variable
ENV NODE_ENV production

# Run the application
CMD [ "node", "src/services/anmo/edgeProcessor.js" ]