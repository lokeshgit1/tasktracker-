FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ../common ./common

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/

# Create uploads directory
RUN mkdir -p uploads

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3002

CMD ["npm", "start"]