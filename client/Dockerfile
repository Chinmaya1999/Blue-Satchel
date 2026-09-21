# Blue Satchel — Consumer Web App
# Multi-stage: build the Vite app with Node, then serve the static output
# with a lightweight Nginx image. This container is deployed and
# blue/green-swapped the same way as the server (see deploy/deploy-app.sh).

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
