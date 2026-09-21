#!/usr/bin/env bash
# Blue Satchel — one-time EC2 bootstrap.
#
# Run this ONCE per server (safe to re-run — every step checks whether it's
# already done and skips it). It installs Docker + Nginx and wires up the
# blue/green Nginx upstream config (covering both the client and server
# containers). It does NOT deploy the app — that's deploy-app.sh, run by
# the regular CI/CD pipeline on every push. Until the first real deploy
# runs, Nginx will 502 on every path — that's expected, not a bootstrap
# failure (there's nothing listening on the upstream ports yet).
#
# Usage (on the EC2 box, as ec2-user): bash setup-ec2.sh
set -euo pipefail

APP_DIR="/opt/blue-satchel"
NGINX_TEMPLATES="$APP_DIR/nginx-templates"

echo "==> Blue Satchel EC2 bootstrap starting"

# --- OS package manager detection (Amazon Linux 2 uses yum, AL2023 uses dnf) ---
if command -v dnf >/dev/null 2>&1; then
  PKG=dnf
else
  PKG=yum
fi

# --- Docker -----------------------------------------------------------------
if command -v docker >/dev/null 2>&1; then
  echo "==> Docker already installed, skipping"
else
  echo "==> Installing Docker"
  sudo "$PKG" update -y
  if [ "$PKG" = dnf ]; then
    sudo dnf install -y docker
  else
    sudo amazon-linux-extras install docker -y
  fi
  sudo systemctl enable --now docker
  sudo usermod -aG docker "$USER"
  echo "==> Docker installed. NOTE: log out/in once for the docker group to take effect."
fi

# --- Nginx --------------------------------------------------------------------
if command -v nginx >/dev/null 2>&1; then
  echo "==> Nginx already installed, skipping"
else
  echo "==> Installing Nginx"
  if [ "$PKG" = dnf ]; then
    sudo dnf install -y nginx
  else
    sudo amazon-linux-extras install nginx1 -y
  fi
  sudo systemctl enable nginx
fi

# The nginx RPM's shipped /etc/nginx/nginx.conf bundles its own inline
# `server { listen 80; server_name _; root /usr/share/nginx/html; ... }`
# block. Since conf.d/*.conf is included before that block, our
# blue-satchel.conf (which explicitly marks itself default_server) already
# wins in practice — but the duplicate causes a noisy
# "conflicting server name" warning on every reload. Strip it once,
# idempotently.
if grep -q 'root         /usr/share/nginx/html;' /etc/nginx/nginx.conf 2>/dev/null; then
  echo "==> Removing nginx.conf's bundled default server block (superseded by blue-satchel.conf)"
  sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak
  python3 - <<'PYEOF'
import re
path = "/etc/nginx/nginx.conf"
with open(path) as f:
    content = f.read()
pattern = re.compile(r"\n    server \{\n        listen       80;.*?\n    \}\n", re.DOTALL)
new_content, n = pattern.subn("\n", content, count=1)
if n:
    with open("/tmp/nginx.conf.cleaned", "w") as f:
        f.write(new_content)
PYEOF
  if [ -f /tmp/nginx.conf.cleaned ]; then
    sudo cp /tmp/nginx.conf.cleaned /etc/nginx/nginx.conf
    rm -f /tmp/nginx.conf.cleaned
  fi
else
  echo "==> nginx.conf already clean of the bundled default server block"
fi

# --- git / rsync (usually present on the AMI, but make sure) -----------------
sudo "$PKG" install -y git rsync >/dev/null 2>&1 || true

# --- App directory layout -----------------------------------------------------
echo "==> Preparing $APP_DIR"
sudo mkdir -p "$NGINX_TEMPLATES" "$APP_DIR/uploads"
sudo chown -R "$USER":"$USER" "$APP_DIR"

# Copy this repo's nginx templates onto the box (this script lives inside
# the checked-out/rsynced deploy/ folder, so its siblings are right here).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$SCRIPT_DIR/nginx/site.conf" /tmp/blue-satchel-site.conf
cp "$SCRIPT_DIR/nginx/upstream-blue.conf" "$NGINX_TEMPLATES/upstream-blue.conf"
cp "$SCRIPT_DIR/nginx/upstream-green.conf" "$NGINX_TEMPLATES/upstream-green.conf"
sudo mv /tmp/blue-satchel-site.conf /etc/nginx/conf.d/blue-satchel.conf

# First deploy ever: point at "blue" until deploy-app.sh runs for real.
if [ ! -f /etc/nginx/conf.d/active-upstream.conf ]; then
  sudo cp "$NGINX_TEMPLATES/upstream-blue.conf" /etc/nginx/conf.d/active-upstream.conf
  # Plain write, not `sudo tee` — this file is owned and updated by
  # deploy-app.sh running as this same non-root user on every deploy.
  echo blue > "$APP_DIR/active-color"
fi

# --- Production secrets template (never overwrite an existing real one) ------
if [ ! -f "$APP_DIR/server.env" ]; then
  cp "$SCRIPT_DIR/server.env.example" "$APP_DIR/server.env"
  echo "==> Created $APP_DIR/server.env from the template."
  echo "    >>> Edit it now with real values (MONGO_URI, JWT_SECRET, etc.) before the first deploy. <<<"
else
  echo "==> $APP_DIR/server.env already exists, leaving it alone."
fi

sudo nginx -t
sudo systemctl reload nginx || sudo systemctl start nginx

echo ""
echo "==> Bootstrap complete."
echo "    Remaining manual steps:"
echo "    1. Edit $APP_DIR/server.env with real production secrets."
echo "    2. In the AWS Console, make sure the EC2 instance's Security Group allows inbound TCP 80 (and 443 if you add TLS later)."
echo "    3. If this was the first time Docker was installed, log out and back in (or run 'newgrp docker') so this user can run docker without sudo."
echo "    4. Push to main — the CI/CD pipeline handles every deploy from here."
