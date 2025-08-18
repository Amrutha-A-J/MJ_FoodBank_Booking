# Build stage
FROM node:18-alpine AS build
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/UTC /etc/localtime && \
    echo "UTC" > /etc/timezone
ENV TZ=UTC
WORKDIR /app
COPY package*.json tsconfig*.json vite.config.ts ./
COPY public ./public
COPY src ./src
RUN npm ci && npm run build

# Production stage
FROM nginx:alpine
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/UTC /etc/localtime && \
    echo "UTC" > /etc/timezone
ENV TZ=UTC
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
