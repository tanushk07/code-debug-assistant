# Optional — for Day 7 Render deploy.
# Render auto-detects this and uses it instead of buildpacks.

FROM node:20-alpine
WORKDIR /app

# Install deps first (better layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Then copy source
COPY src ./src

EXPOSE 3001
CMD ["node", "src/index.js"]
