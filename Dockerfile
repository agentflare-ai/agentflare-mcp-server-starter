FROM node:18-alpine

WORKDIR /app

# Copy package files and install all dependencies (including dev for TypeScript)
COPY package*.json ./
RUN npm ci

# Copy only source and config files (no test files, no .env)
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose port for HTTP transport
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the server
CMD ["node", "dist/index.js", "--transport", "http"]