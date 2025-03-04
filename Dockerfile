# ============================================================
# Stage 1 — Build (frontend + install all deps)
# ============================================================
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for vite build)
RUN npm ci --ignore-scripts

# Copy source files needed for the build
COPY index.html ./
COPY frontend/ ./frontend/
COPY backend/ ./backend/
COPY scripts/tools/clean-simple.js ./scripts/tools/clean-simple.js
COPY scripts/tools/setup-assets.js ./scripts/tools/setup-assets.js

# Build the frontend (Vite build only, no server start)
RUN npm run build:only

# ============================================================
# Stage 2 — Production runtime
# ============================================================
FROM node:22-alpine AS production

WORKDIR /app

# Add non-root user for security
RUN addgroup -S mycelium && adduser -S mycelium -G mycelium

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from build stage
COPY --from=build /app/dist ./dist/

# Copy SQL schemas (useful for init scripts)
COPY sql/ ./sql/

# Create public/uploads directory and set ownership
RUN mkdir -p ./public/uploads && chown -R mycelium:mycelium /app

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose the application port
EXPOSE 3000

# Switch to non-root user
USER mycelium

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the server
CMD ["node", "backend/server.cjs"]
