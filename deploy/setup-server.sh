#!/usr/bin/env bash
# Image Compress — VPS bootstrap script.
#
# Run on a fresh Ubuntu/Debian VPS as root. It will:
#   1. Install xcaddy and rebuild Caddy with the Cloudflare DNS plugin.
#   2. Create /var/www/image-compress and a deploy user.
#   3. Generate the Caddyfile (DNS-01 challenge — port 80 not required).
#   4. Inject the Cloudflare API token via systemd drop-in.
#   5. Start Caddy. Let's Encrypt cert is issued automatically via DNS-01.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/USER/REPO/main/deploy/setup-server.sh | \
#     sudo DOMAIN=fsavin.ru CF_API_TOKEN=xxxxxxxx bash
#
# Or copy the script to the VPS and run:
#   sudo DOMAIN=fsavin.ru CF_API_TOKEN=xxxxxxxx bash setup-server.sh
#
# Required env vars:
#   DOMAIN         — your domain (e.g. fsavin.ru)
#   CF_API_TOKEN   — Cloudflare API token with Zone:DNS:Edit for that zone
#
# Optional env vars:
#   DEPLOY_USER    — username for GitHub Actions to ssh as (default: deploy)
#   WEBROOT        — site root (default: /var/www/image-compress)

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "This script must run as root (use sudo)." >&2
  exit 1
fi

: "${DOMAIN:?Set DOMAIN env var (e.g. DOMAIN=fsavin.ru)}"
: "${CF_API_TOKEN:?Set CF_API_TOKEN env var (Cloudflare API token, Zone:DNS:Edit)}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
WEBROOT="${WEBROOT:-/var/www/image-compress}"

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*" >&2; }

log "Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg lsb-release rsync git \
  debian-keyring debian-archive-keyring apt-transport-https

# ---- 1. Install Caddy + xcaddy from cloudsmith ----
if ! command -v caddy >/dev/null 2>&1; then
  log "Adding Caddy apt repository"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
fi

if ! command -v xcaddy >/dev/null 2>&1; then
  log "Adding xcaddy apt repository"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/xcaddy/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-xcaddy-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/xcaddy/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-xcaddy.list
  apt-get update -qq
  apt-get install -y -qq xcaddy
fi

# ---- 2. Rebuild Caddy with the Cloudflare DNS plugin (idempotent) ----
if ! caddy list-modules 2>/dev/null | grep -q '^dns.providers.cloudflare'; then
  log "Rebuilding Caddy with Cloudflare DNS plugin"
  systemctl stop caddy || true
  cd /tmp
  rm -f caddy
  xcaddy build --with github.com/caddy-dns/cloudflare
  if [[ -f /usr/bin/caddy && ! -f /usr/bin/caddy.backup ]]; then
    mv /usr/bin/caddy /usr/bin/caddy.backup
  fi
  mv ./caddy /usr/bin/caddy
  chmod +x /usr/bin/caddy
  setcap cap_net_bind_service=+ep /usr/bin/caddy
  log "Caddy modules: $(caddy list-modules | grep cloudflare || true)"
else
  log "Caddy already has Cloudflare DNS plugin — skipping rebuild"
fi

# ---- 3. Webroot and deploy user ----
log "Creating webroot at $WEBROOT"
mkdir -p "$WEBROOT"

if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  log "Creating deploy user: $DEPLOY_USER"
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi

chown -R "$DEPLOY_USER:$DEPLOY_USER" "$WEBROOT"

DEPLOY_SSH_DIR="/home/$DEPLOY_USER/.ssh"
mkdir -p "$DEPLOY_SSH_DIR"
touch "$DEPLOY_SSH_DIR/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_SSH_DIR"
chmod 700 "$DEPLOY_SSH_DIR"
chmod 600 "$DEPLOY_SSH_DIR/authorized_keys"

# ---- 4. Caddyfile ----
log "Writing /etc/caddy/Caddyfile"
cat >/etc/caddy/Caddyfile <<EOF
{
    # Port 80 is closed at the provider firewall; skip HTTP→HTTPS redirects.
    auto_https disable_redirects
}

$DOMAIN {
    root * $WEBROOT
    file_server
    encode zstd gzip

    tls {
        dns cloudflare {env.CF_API_TOKEN}
        resolvers 1.1.1.1
    }

    header {
        Cross-Origin-Opener-Policy "same-origin"
        Cross-Origin-Embedder-Policy "require-corp"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }

    @assets path /assets/*
    header @assets Cache-Control "public, max-age=31536000, immutable"

    @nocache path /index.html / /manifest.json /robots.txt /sitemap.xml
    header @nocache Cache-Control "public, max-age=0, must-revalidate"

    try_files {path} /index.html
}
EOF

# ---- 5. Inject CF_API_TOKEN via systemd drop-in ----
log "Configuring systemd drop-in with CF_API_TOKEN"
mkdir -p /etc/systemd/system/caddy.service.d
cat >/etc/systemd/system/caddy.service.d/cloudflare.conf <<EOF
[Service]
Environment="CF_API_TOKEN=$CF_API_TOKEN"
EOF
chmod 600 /etc/systemd/system/caddy.service.d/cloudflare.conf

# ---- 6. Placeholder index.html so Caddy has something to serve ----
if [[ ! -f "$WEBROOT/index.html" ]]; then
  cat >"$WEBROOT/index.html" <<EOF
<!doctype html>
<meta charset="utf-8">
<title>Image Compress — placeholder</title>
<style>body{font-family:system-ui;max-width:520px;margin:6rem auto;padding:0 1rem;color:#333}</style>
<h1>Image Compress</h1>
<p>Server is configured. Awaiting first deploy from CI.</p>
EOF
  chown "$DEPLOY_USER:$DEPLOY_USER" "$WEBROOT/index.html"
fi

# ---- 7. Validate & start ----
log "Validating Caddyfile"
caddy validate --config /etc/caddy/Caddyfile

log "Reloading systemd and restarting Caddy"
systemctl daemon-reload
systemctl enable caddy >/dev/null
systemctl restart caddy

# ---- 8. Wait briefly and report ----
log "Waiting for cert (up to 60s)..."
for i in {1..30}; do
  if journalctl -u caddy --since "1 minute ago" 2>/dev/null \
       | grep -q "certificate obtained successfully"; then
    log "✅ Certificate issued for $DOMAIN"
    break
  fi
  sleep 2
done

cat <<EOF

──────────────────────────────────────────────────────────────────────
✅ Server setup complete.

Site:        https://$DOMAIN
Webroot:     $WEBROOT
Deploy user: $DEPLOY_USER
Caddy logs:  journalctl -u caddy -f

NEXT STEPS:

1) Add a deploy SSH key (run on your local machine):
       ssh-keygen -t ed25519 -f ~/.ssh/img_compress_deploy -N ""
       ssh-copy-id -i ~/.ssh/img_compress_deploy.pub $DEPLOY_USER@$DOMAIN

   …or paste the public key into:
       /home/$DEPLOY_USER/.ssh/authorized_keys

2) Add GitHub Actions secrets in your repo Settings → Secrets:
       VPS_HOST     = $DOMAIN
       VPS_USER     = $DEPLOY_USER
       VPS_PATH     = $WEBROOT
       VPS_SSH_KEY  = (paste contents of ~/.ssh/img_compress_deploy)

3) Push to main — .github/workflows/deploy-vps.yml will deploy.

If the cert hasn't appeared in 1–2 minutes, check:
   - DNS for $DOMAIN points at this VPS in Cloudflare?
   - Cloudflare proxy is OFF (grey cloud) for $DOMAIN?
   - CF_API_TOKEN has Zone:DNS:Edit for $DOMAIN?
   - Watch: journalctl -u caddy -f
──────────────────────────────────────────────────────────────────────
EOF
