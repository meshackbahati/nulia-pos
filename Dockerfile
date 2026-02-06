# Use Node 18 Alpine for a lightweight, secure base
FROM node:18-alpine

# Set working directory to the app root inside the container
WORKDIR /app

# Copy backend package manifest files from the local backend directory
# This allows us to leverage Docker's layer caching for node_modules
COPY backend/package*.json ./

# Install production dependencies only
# We use 'npm ci' for more reliable and faster builds in CI/CD
RUN npm ci --omit=dev

# Copy the rest of the backend source code from the local backend directory
COPY backend/ .

# Ensure standard cloud environment variables are set
# Northflank will override PORT with its own value if specified
ENV PORT=3000
EXPOSE 3000

# Set execution environment to production
ENV NODE_ENV=production

# Start the backend server using the command defined in package.json
CMD ["npm", "start"]
