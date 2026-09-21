#!/usr/bin/env bash
# Blue Satchel — zero-downtime client deploy.
#
# The built client (client/dist) is rsynced by the CI/CD workflow into
# /opt/blue-satchel/releases/<ref>/client-dist BEFORE this script runs.
# This script just re-points the `client-current` symlink that Nginx's
# `root` directive uses — a symlink swap is atomic at the filesystem level,
# so there is no moment where Nginx sees a half-updated directory, and no
# reload is even required for Nginx to pick it up.
#
# Usage: deploy-client.sh <ref>   (ref = the release folder name, e.g. a git SHA)
set -euo pipefail

REF="${1:?Usage: deploy-client.sh <ref>}"
APP_DIR="/opt/blue-satchel"
NEW_RELEASE="$APP_DIR/releases/$REF/client-dist"

if [ ! -d "$NEW_RELEASE" ] || [ ! -f "$NEW_RELEASE/index.html" ]; then
  echo "!! $NEW_RELEASE does not look like a valid build (missing index.html). Aborting."
  exit 1
fi

echo "==> Switching client-current -> $NEW_RELEASE"
ln -sfn "$NEW_RELEASE" "$APP_DIR/client-current"

# Keep the last 5 releases on disk (rollback material), prune the rest.
cd "$APP_DIR/releases"
ls -1t | tail -n +6 | while read -r old; do
  [ "$old" = "placeholder" ] && continue
  echo "==> Pruning old release $old"
  rm -rf "${old:?}"
done

echo "==> Client deploy complete."
