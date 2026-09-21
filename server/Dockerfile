# Blue Satchel — Business Platform API
# Debian-based (not alpine) so sharp's prebuilt binary installs cleanly.
FROM node:20-bookworm-slim

WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

RUN mkdir -p uploads
EXPOSE 5000

# Container-level health check, used by `docker inspect` / orchestration;
# the deploy script also polls /api/health directly over HTTP.
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
