# Use the official Node.js image as the base image
FROM node:20-bullseye-slim as base

# Create the data directory for database storage
RUN mkdir -p /data && chown node:node /data

# Create and change to the app directory
WORKDIR /usr/src/app

# Install Node.js dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build the TypeScript code
RUN npm run build

# Switch to non-root user
USER node

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "watch:start"]
