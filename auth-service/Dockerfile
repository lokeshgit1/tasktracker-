FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ../common ../common

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S tasktrackr -u 1001

# Change ownership
RUN chown -R tasktrackr:nodejs /app
USER tasktrackr

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/auth/health || exit 1

# Start the application
CMD ["npm", "start"]