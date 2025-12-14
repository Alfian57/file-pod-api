# Base stage with bun setup
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Production dependencies stage
FROM base AS prod-deps
COPY package.json bun.lock ./
# Install only production dependencies
RUN bun install --production --frozen-lockfile --ignore-scripts

# Build stage - install all dependencies and build
FROM base AS build
COPY package.json bun.lock ./
# Install all dependencies (including dev dependencies)
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
# Generate Prisma client and build
RUN bunx prisma generate && bun run build

# Final stage - combine production dependencies and build output
FROM node:23-alpine AS runner
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

# Use the node user from the image
USER node

# Expose port 8080
EXPOSE 8080

# Start the server using CommonJS format (required for Prisma compatibility)
CMD ["node", "dist/index.cjs"]
