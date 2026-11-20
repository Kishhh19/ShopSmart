#!/bin/bash
# ShopSmart single-host install/update for Amazon Linux 2023 (run as root).
# Installs Node 22, PostgreSQL 16 and Caddy; deploys the release bundle from S3;
# applies committed Prisma migrations (never `migrate dev`, never a reset).
# Usage: bootstrap.sh <s3-bucket> <bundle-key>
set -euo pipefail
BUCKET="$1"; KEY="$2"
APP=/opt/shopsmart; ENVF=/etc/shopsmart/api.env
CADDY_VERSION=2.10.2
log() { echo "[bootstrap $(date -u +%FT%TZ)] $*"; }

# 1 GB swap so npm ci and the Vite build fit on a t3.micro.
if ! swapon --show | grep -q /swapfile; then
  dd if=/dev/zero of=/swapfile bs=1M count=1024 status=none; chmod 600 /swapfile; mkswap /swapfile >/dev/null; swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap defaults 0 0' >> /etc/fstab
fi

log "packages"
dnf -y -q install postgresql16-server postgresql16 tar xz >/dev/null
# Latest Node 22 LTS from nodejs.org, checked against the published SHA-256.
if [ ! -x /opt/node/bin/node ]; then
  SUMS=$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt)
  FILE=$(echo "$SUMS" | awk '/linux-x64.tar.xz$/ {print $2}')
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/$FILE" -o /tmp/node.tar.xz
  echo "$(echo "$SUMS" | awk '/linux-x64.tar.xz$/ {print $1}')  /tmp/node.tar.xz" | sha256sum -c -
  mkdir -p /opt/node && tar -xJf /tmp/node.tar.xz -C /opt/node --strip-components=1
fi
export PATH=/opt/node/bin:$PATH
if [ ! -x /usr/local/bin/caddy ]; then
  curl -fsSL "https://github.com/caddyserver/caddy/releases/download/v$CADDY_VERSION/caddy_${CADDY_VERSION}_linux_amd64.tar.gz" -o /tmp/caddy.tgz
  tar -xzf /tmp/caddy.tgz -C /usr/local/bin caddy && chmod 755 /usr/local/bin/caddy
fi
id caddy >/dev/null 2>&1 || useradd --system --home /var/lib/caddy --create-home --shell /sbin/nologin caddy
id shopsmart >/dev/null 2>&1 || useradd --system --home "$APP" --shell /sbin/nologin shopsmart

log "postgresql (local only, port 5432 never opened in the security group)"
if [ ! -f /var/lib/pgsql/data/PG_VERSION ]; then postgresql-setup --initdb >/dev/null; fi
# Password auth over localhost TCP for the app user.
sed -i -E 's#^(host\s+all\s+all\s+127\.0\.0\.1/32\s+)ident#\1scram-sha-256#; s#^(host\s+all\s+all\s+::1/128\s+)ident#\1scram-sha-256#' /var/lib/pgsql/data/pg_hba.conf
systemctl enable --now postgresql >/dev/null 2>&1; systemctl reload postgresql

mkdir -p /etc/shopsmart && chmod 750 /etc/shopsmart
if [ ! -f "$ENVF" ]; then
  # The database password is generated here on the server and never leaves it.
  DBPASS=$(openssl rand -hex 24)
  sudo -u postgres psql -q -c "CREATE ROLE shopsmart_user LOGIN PASSWORD '$DBPASS';"
  sudo -u postgres psql -q -c "CREATE DATABASE shopsmart OWNER shopsmart_user;"
  sudo -u postgres psql -q -c "CREATE DATABASE shopsmart_test OWNER shopsmart_user;"
  cat > "$ENVF" <<ENV
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
TRUST_PROXY=1
DATABASE_URL=postgresql://shopsmart_user:$DBPASS@127.0.0.1:5432/shopsmart?schema=public
TEST_DATABASE_URL=postgresql://shopsmart_user:$DBPASS@127.0.0.1:5432/shopsmart_test?schema=public
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
ENV
  unset DBPASS
fi
chown root:shopsmart "$ENVF"; chmod 640 "$ENVF"

log "release bundle s3://$BUCKET/$KEY"
aws s3 cp --quiet "s3://$BUCKET/$KEY" /tmp/shopsmart.tgz
NEW="$APP/releases/$(date -u +%Y%m%d%H%M%S)"; mkdir -p "$NEW"
tar -xzf /tmp/shopsmart.tgz -C "$NEW"
cd "$NEW"
npm ci --no-audit --no-fund --loglevel=error
npm run db:generate --silent
VITE_API_URL=/api npm run build --silent
set -a; . "$ENVF"; set +a
npm run db:deploy --silent
# First use only: seed the six catalog products into an empty database.
COUNT=$(sudo -u postgres psql -tA -d shopsmart -c 'SELECT count(*) FROM "Product";')
if [ "$COUNT" = "0" ]; then log "seeding empty catalog"; NODE_ENV=development npm run db:seed --silent; fi
chown -R shopsmart:shopsmart "$APP"
ln -sfn "$NEW" "$APP/current"
cp "$NEW/deploy/shopsmart-api.service" "$NEW/deploy/shopsmart-hostconfig.service" "$NEW/deploy/caddy.service" /etc/systemd/system/
install -m 755 "$NEW/deploy/configure-host.sh" /usr/local/bin/shopsmart-configure-host
# Keep only the three newest releases.
ls -1dt "$APP"/releases/* | tail -n +4 | xargs -r rm -rf
systemctl daemon-reload
systemctl enable shopsmart-hostconfig shopsmart-api caddy >/dev/null 2>&1
systemctl restart shopsmart-hostconfig shopsmart-api caddy
log "done: $(cat /etc/shopsmart/site-url 2>/dev/null)"
