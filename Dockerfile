# Use LTS Node
FROM node:22

WORKDIR /app

# Install MySQL client for mysqldump
RUN apt-get update && apt-get install -y default-mysql-client && rm -rf /var/lib/apt/lists/*

# Copy package.json only (not package-lock.json)
COPY package.json ./

# Clean install dependencies for the current platform (Linux)
RUN npm install

# Copy the rest of your source code
COPY . .

# Expose your app port
EXPOSE 3000

# Use npm run dev for development with tsx
CMD ["npm", "run", "dev"]
