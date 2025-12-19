FROM node:20-alpine

WORKDIR /app

# Install whois for domain checks
RUN apk add --no-cache whois

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production && npm cache clean --force

# Copy application code
COPY server ./server
COPY public ./public

# Create data directory
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server/index.js"]
