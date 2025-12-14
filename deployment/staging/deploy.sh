#!/bin/bash
# Script to deploy to staging environment

echo "Deploying to staging..."
# Pull latest code
git pull origin main

# Build the project
npm install
npm run build

# Apply database migrations
npx sequelize-cli db:migrate

# Restart server
pm2 restart all

echo "Deployment to staging completed."