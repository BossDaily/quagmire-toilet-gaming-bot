# Use the official Node.js image as the base image
FROM node:20-bullseye-slim as base

# Install Python and venv
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN python3 -m pip install --upgrade pip

# Create and change to the app directory
WORKDIR /usr/src/app

# Set up Python virtual environment
RUN python3 -m venv /usr/src/app/venv
ENV PATH="/usr/src/app/venv/bin:$PATH"

# Install Python dependencies (if you have requirements.txt)
COPY requirements.txt* ./
RUN if [ -f "requirements.txt" ]; then pip install -r requirements.txt; fi

# Install Node.js dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "watch:start"]
