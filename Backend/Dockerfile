# syntax=docker/dockerfile:1.7

# ---- deps stage --------------------------------------------------------
# Build native modules (bcrypt) here so the runtime image stays small.
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package*.json ./
RUN npm ci --omit=dev

# ---- runtime stage -----------------------------------------------------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Non-root user for safer container runtime.
RUN addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=app:app package*.json ./
COPY --chown=app:app src ./src
COPY --chown=app:app schema.sql ./schema.sql

# Pre-create the uploads directory so the non-root user can write to it.
RUN mkdir -p /app/uploads && chown app:app /app/uploads

USER app
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "src/index.js"]
