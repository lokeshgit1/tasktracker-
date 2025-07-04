FROM node:18-alpine

WORKDIR /app

# Install system dependencies for sharp
RUN apk add --no-cache \
    libc6-compat \
    vips-dev

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

# Create uploads directory
RUN mkdir -p uploads && chown -R tasktrackr:nodejs uploads

# Change ownership
RUN chown -R tasktrackr:nodejs /app
USER tasktrackr

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/api/tasks/health || exit 1

# Start the application
CMD ["npm", "start"]