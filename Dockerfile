FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files and install all dependencies (including dev for TypeScript)
COPY package*.json ./
RUN npm ci

# Copy source and config files
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Set default environment variables (can be overridden at runtime)
ENV TRANSPORT_TYPE=http \
    HTTP_PORT=3000 \
    HTTP_HOST=0.0.0.0 \
    LOG_LEVEL=info \
    PROTOCOL_VERSION=2025-06-18 \
    SERVER_NAME=basic-mcp-server \
    SERVER_VERSION=1.0.0 \
    ENABLE_CORS=true \
    AUTH_ENABLED=false \
    RATE_LIMIT_ENABLED=false

# Expose port for HTTP transport
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the server
CMD ["node", "dist/index.js", "--transport", "http"]