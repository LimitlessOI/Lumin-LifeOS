```Dockerfile
FROM node:14

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Set working directory
WORKDIR /app

COPY package*.json ./

# Install dependencies (production only)
# Use npm install to ensure all deps are installed even if package-lock is slightly out of sync
RUN npm install --production --no-audit --no-fund && \
    npm cache clean --force

COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/public/overlay /app/logs && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port (Railway will set PORT env var)
EXPOSE 8080

# Health check with longer start period for complex startup
# Use sh -c to properly expand PORT env var, fallback to 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD sh -c 'curl -f http://localhost:${PORT:-8080}/healthz || exit 1'

# Start the application
CMD ["node", "server.js"]
