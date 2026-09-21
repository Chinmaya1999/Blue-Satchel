#!/usr/bin/env bash
# Blue Satchel — zero-downtime server deploy (blue/green container swap).
#
# Starts the new image on the currently-inactive color/port, health-checks
# it directly (bypassing Nginx), and only then flips the Nginx upstream and
# reloads (a graceful reload — in-flight requests finish, new ones go to
# the new container). If the health check fails at any point, this script
# aborts, the new container is torn down, and the OLD container just keeps
# serving traffic untouched — a bad deploy never takes the site down.
#
# Usage: deploy-server.sh <full-image-ref>
#   e.g. deploy-server.sh ghcr.io/chinmaya1999/blue-satchel-server:abc1234
set -euo pipefail

IMAGE="${1:?Usage: deploy-server.sh <image>}"
APP_DIR="/opt/blue-satchel"
HEALTH_RETRIES=30
HEALTH_DELAY=2

mkdir -p "$APP_DIR/uploads"

ACTIVE_COLOR="blue"
[ -f "$APP_DIR/active-color" ] && ACTIVE_COLOR="$(cat "$APP_DIR/active-color")"

if [ "$ACTIVE_COLOR" = "blue" ]; then
  TARGET_COLOR="green"; TARGET_PORT=5002
else
  TARGET_COLOR="blue"; TARGET_PORT=5001
fi

echo "==> Active color is '$ACTIVE_COLOR'. Deploying new image to '$TARGET_COLOR' (port $TARGET_PORT)."

echo "==> Pulling $IMAGE"
docker pull "$IMAGE"

echo "==> Starting $TARGET_COLOR container"
docker rm -f "bs-server-$TARGET_COLOR" >/dev/null 2>&1 || true
docker run -d \
  --name "bs-server-$TARGET_COLOR" \
  --restart unless-stopped \
  -p "127.0.0.1:${TARGET_PORT}:5000" \
  --env-file "$APP_DIR/server.env" \
  -v "$APP_DIR/uploads:/app/uploads" \
  "$IMAGE"

echo "==> Health-checking new container on port $TARGET_PORT"
healthy=false
for i in $(seq 1 "$HEALTH_RETRIES"); do
  if curl -sf "http://127.0.0.1:${TARGET_PORT}/api/health" >/dev/null 2>&1; then
    healthy=true
    break
  fi
  echo "    attempt $i/$HEALTH_RETRIES not ready yet, waiting ${HEALTH_DELAY}s…"
  sleep "$HEALTH_DELAY"
done

if [ "$healthy" != true ]; then
  echo "!! New container failed health checks. Rolling back — old '$ACTIVE_COLOR' container is untouched and still live."
  docker logs "bs-server-$TARGET_COLOR" --tail 80 || true
  docker rm -f "bs-server-$TARGET_COLOR" >/dev/null 2>&1 || true
  exit 1
fi

echo "==> Healthy. Switching Nginx upstream to $TARGET_COLOR"
cp "$APP_DIR/nginx-templates/upstream-${TARGET_COLOR}.conf" /tmp/active-upstream.conf.new
sudo mv /tmp/active-upstream.conf.new /etc/nginx/conf.d/active-upstream.conf
sudo nginx -t
sudo systemctl reload nginx

echo "$TARGET_COLOR" > "$APP_DIR/active-color"

echo "==> Draining old '$ACTIVE_COLOR' container (5s) before removing it"
sleep 5
docker rm -f "bs-server-$ACTIVE_COLOR" >/dev/null 2>&1 || true

docker image prune -f >/dev/null 2>&1 || true

echo "==> Server deploy complete. Live color: $TARGET_COLOR ($IMAGE)"
