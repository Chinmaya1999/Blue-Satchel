#!/usr/bin/env bash
# Blue Satchel — zero-downtime deploy (blue/green swap, client + server together).
#
# Starts the new server AND client containers on the currently-inactive
# color's ports, health-checks both directly (bypassing Nginx), and only
# then flips the Nginx upstream and reloads (graceful — in-flight requests
# finish, new ones go to the new containers). If either health check
# fails, this script aborts, both new containers are torn down, and the
# OLD pair just keeps serving traffic untouched — a bad deploy never
# takes the site down, and client/server are always a matched pair.
#
# Usage: deploy-app.sh <server-image> <client-image>
set -euo pipefail

SERVER_IMAGE="${1:?Usage: deploy-app.sh <server-image> <client-image>}"
CLIENT_IMAGE="${2:?Usage: deploy-app.sh <server-image> <client-image>}"
APP_DIR="/opt/blue-satchel"
HEALTH_RETRIES=30
HEALTH_DELAY=2

mkdir -p "$APP_DIR/uploads"

ACTIVE_COLOR="blue"
[ -f "$APP_DIR/active-color" ] && ACTIVE_COLOR="$(cat "$APP_DIR/active-color")"

if [ "$ACTIVE_COLOR" = "blue" ]; then
  TARGET_COLOR="green"; SERVER_PORT=5002; CLIENT_PORT=8082
else
  TARGET_COLOR="blue"; SERVER_PORT=5001; CLIENT_PORT=8081
fi

echo "==> Active color is '$ACTIVE_COLOR'. Deploying to '$TARGET_COLOR' (server:$SERVER_PORT client:$CLIENT_PORT)."

echo "==> Pulling images"
docker pull "$SERVER_IMAGE"
docker pull "$CLIENT_IMAGE"

echo "==> Starting $TARGET_COLOR containers"
docker rm -f "bs-server-$TARGET_COLOR" "bs-client-$TARGET_COLOR" >/dev/null 2>&1 || true

docker run -d \
  --name "bs-server-$TARGET_COLOR" \
  --restart unless-stopped \
  -p "127.0.0.1:${SERVER_PORT}:5000" \
  --env-file "$APP_DIR/server.env" \
  -v "$APP_DIR/uploads:/app/uploads" \
  "$SERVER_IMAGE"

docker run -d \
  --name "bs-client-$TARGET_COLOR" \
  --restart unless-stopped \
  -p "127.0.0.1:${CLIENT_PORT}:80" \
  "$CLIENT_IMAGE"

wait_healthy() {
  local url="$1" label="$2"
  for i in $(seq 1 "$HEALTH_RETRIES"); do
    if curl -sf "$url" >/dev/null 2>&1; then return 0; fi
    echo "    [$label] attempt $i/$HEALTH_RETRIES not ready yet, waiting ${HEALTH_DELAY}s…"
    sleep "$HEALTH_DELAY"
  done
  return 1
}

rollback() {
  echo "!! $1 failed health checks. Rolling back — old '$ACTIVE_COLOR' pair is untouched and still live."
  docker logs "bs-server-$TARGET_COLOR" --tail 80 2>/dev/null || true
  docker logs "bs-client-$TARGET_COLOR" --tail 80 2>/dev/null || true
  docker rm -f "bs-server-$TARGET_COLOR" "bs-client-$TARGET_COLOR" >/dev/null 2>&1 || true
  exit 1
}

echo "==> Health-checking new server on port $SERVER_PORT"
wait_healthy "http://127.0.0.1:${SERVER_PORT}/api/health" server || rollback "Server"

echo "==> Health-checking new client on port $CLIENT_PORT"
wait_healthy "http://127.0.0.1:${CLIENT_PORT}/" client || rollback "Client"

echo "==> Both healthy. Switching Nginx upstream to $TARGET_COLOR"
cp "$APP_DIR/nginx-templates/upstream-${TARGET_COLOR}.conf" /tmp/active-upstream.conf.new
sudo mv /tmp/active-upstream.conf.new /etc/nginx/conf.d/active-upstream.conf
sudo nginx -t
sudo systemctl reload nginx

echo "$TARGET_COLOR" > "$APP_DIR/active-color"

echo "==> Draining old '$ACTIVE_COLOR' pair (5s) before removing it"
sleep 5
docker rm -f "bs-server-$ACTIVE_COLOR" "bs-client-$ACTIVE_COLOR" >/dev/null 2>&1 || true

docker image prune -f >/dev/null 2>&1 || true

echo "==> Deploy complete. Live color: $TARGET_COLOR"
echo "    server: $SERVER_IMAGE"
echo "    client: $CLIENT_IMAGE"
