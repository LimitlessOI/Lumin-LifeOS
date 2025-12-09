```bash
#!/bin/bash

# Update package list and install prerequisites
sudo apt update
sudo apt install -y curl software-properties-common

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install global tools
npm install -g typescript

# Set up local blockchain testnet (Ganache for Ethereum)
npm install -g ganache-cli

# Mock APIs for testing
# (This would be specific to your requirements)
echo "Environment setup complete."
```