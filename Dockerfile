FROM node:20-alpine

WORKDIR /app

# Install Bun
RUN npm install -g bun

# Copy package files
COPY package.json bun.lockb bunfig.toml ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Expose port for preview
EXPOSE 5173

# Default command - start preview server
CMD ["bun", "run", "preview"]
