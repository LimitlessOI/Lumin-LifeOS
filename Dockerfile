# Use Node.js 18 LTS (required for native fetch API)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for better Docker layer caching)
COPY package*.json ./

# Install dependencies
# Use npm install to auto-generate/update package-lock.json if needed
RUN npm install --production --no-audit --no-fund --package-lock-only || npm install --production --no-audit --no-fund

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p /app/public/overlay /app/logs

# Expose port (Railway will set PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]
