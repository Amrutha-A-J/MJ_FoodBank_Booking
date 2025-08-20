# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json tsconfig*.json vite.config.ts ./
COPY public ./public
COPY src ./src
RUN npm ci && npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
