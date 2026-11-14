# ==========================================
# 1. Builder Stage
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (cached if package files don't change)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build static frontend
COPY . .
RUN npm run build

# ==========================================
# 2. Production Runner Stage
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled frontend from builder
COPY --from=builder --chown=node:node /app/dist ./dist

# Copy production backend server
COPY --chown=node:node server.ts ./

# Run with unprivileged user for security
USER node

EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

# Start server using Node 22 native type stripping
CMD ["node", "--experimental-strip-types", "server.ts"]
