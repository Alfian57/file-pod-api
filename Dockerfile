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

# Copy production dependencies
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules

# Copy build output
COPY --from=build --chown=node:node /app/dist ./dist

# Copy Prisma generated client with Query Engine
COPY --from=build --chown=node:node /app/src/generated ./src/generated

# Copy Prisma schema and migrations for running migrations
COPY --from=build --chown=node:node /app/prisma ./prisma

# Copy package.json for prisma commands
COPY --from=build --chown=node:node /app/package.json ./

# Install Prisma CLI globally for migrations
RUN npm install -g prisma

# Create a migration script
RUN echo '#!/bin/sh\nprisma migrate deploy' > /app/migrate.sh && chmod +x /app/migrate.sh

# Use the node user from the image
USER node

# Expose port 8080
EXPOSE 8080

# Default command - start the server
CMD ["node", "dist/index.cjs"]
