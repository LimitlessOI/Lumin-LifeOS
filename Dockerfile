# Use Node.js LTS version
FROM node:16

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy the application code
COPY . .

# Expose application port
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]
