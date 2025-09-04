# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
COPY src ./src
COPY types ./types
RUN npm ci && npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
ENV PORT=4000
# JWT_SECRET must be supplied at runtime
CMD ["node", "dist/server.js"]
