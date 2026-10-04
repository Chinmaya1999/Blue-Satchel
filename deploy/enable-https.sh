#!/usr/bin/env bash
# DXB BEAUTY — issue a Let's Encrypt certificate and switch nginx to HTTPS.
#
# Prerequisites: DNS A records for dxbbeauty.com, www.dxbbeauty.com,
# api.dxbbeauty.com, dxb-beauty.com and www.dxb-beauty.com all point at this
# server, and the Security Group allows inbound TCP 80 and 443.
# Safe to re-run (certbot keeps the existing cert until it is due for renewal).
#
# Usage (on the EC2 box, as ec2-user): bash enable-https.sh
set -euo pipefail

EMAIL="Pradipta@uuoinnovation.com"
DOMAINS=(dxbbeauty.com www.dxbbeauty.com api.dxbbeauty.com dxb-beauty.com www.dxb-beauty.com)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if command -v dnf >/dev/null 2>&1; then PKG=dnf; else PKG=yum; fi

# --- certbot -----------------------------------------------------------------
if ! command -v certbot >/dev/null 2>&1; then
  echo "==> Installing certbot"
  sudo "$PKG" install -y certbot || {
    sudo "$PKG" install -y python3-pip
    sudo python3 -m venv /opt/certbot
    sudo /opt/certbot/bin/pip install --upgrade pip certbot
    sudo ln -sf /opt/certbot/bin/certbot /usr/local/bin/certbot
  }
fi

# --- HTTP config first, so the ACME challenge on port 80 is reachable --------
sudo mkdir -p /var/www/certbot
sudo cp "$SCRIPT_DIR/nginx/site.conf" /etc/nginx/conf.d/blue-satchel.conf
sudo nginx -t
sudo systemctl reload nginx

# --- Issue one certificate covering every name -------------------------------
ARGS=()
for d in "${DOMAINS[@]}"; do ARGS+=(-d "$d"); done
sudo certbot certonly --webroot -w /var/www/certbot "${ARGS[@]}" \
  --cert-name dxbbeauty.com --email "$EMAIL" --agree-tos --no-eff-email \
  --non-interactive --keep-until-expiring

# --- Switch nginx to the HTTPS config ----------------------------------------
sudo cp "$SCRIPT_DIR/nginx/site-ssl.conf" /etc/nginx/conf.d/blue-satchel.conf
sudo nginx -t
sudo systemctl reload nginx

# --- Auto-renewal (reload nginx after each renewal) ---------------------------
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nsystemctl reload nginx\n' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
if systemctl list-unit-files 2>/dev/null | grep -q '^certbot-renew.timer'; then
  sudo systemctl enable --now certbot-renew.timer
else
  echo '17 3,15 * * * root certbot renew -q' | sudo tee /etc/cron.d/certbot-renew >/dev/null
fi

echo "==> HTTPS enabled: https://dxbbeauty.com and https://api.dxbbeauty.com"
