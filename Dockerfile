# Use Node.js LTS version
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package.json ./
RUN corepack enable && yarn install

# Copy the application code
COPY . .

# Expose application port
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]
