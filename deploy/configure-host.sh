#!/bin/bash
# Runs at every boot before Caddy: builds the public HTTPS hostname from the instance's
# current public IPv4 (Elastic IP), e.g. 13.250.1.2 -> 13-250-1-2.sslip.io, and writes the Caddyfile.
set -euo pipefail
TOKEN=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
IP=$(curl -fsS -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)
HOSTNAME="${IP//./-}.sslip.io"
mkdir -p /etc/caddy
cat > /etc/caddy/Caddyfile <<CADDY
{
	email admin@example.com
}

$HOSTNAME {
	encode gzip
	# API: only Caddy is public; Express listens on 127.0.0.1:3000.
	handle /api/* {
		reverse_proxy 127.0.0.1:3000
	}
	# Frontend: Vite build with single-page-app rewrite so /cart or /account survive a refresh.
	handle {
		root * /opt/shopsmart/current/frontend/dist
		try_files {path} /index.html
		file_server
	}
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
	}
	log {
		output file /var/log/caddy/access.log
	}
}
CADDY
mkdir -p /var/log/caddy && chown caddy:caddy /var/log/caddy
echo "https://$HOSTNAME" > /etc/shopsmart/site-url
# CORS origin for the API is the same public HTTPS origin.
if grep -q '^FRONTEND_URL=' /etc/shopsmart/api.env; then sed -i "s#^FRONTEND_URL=.*#FRONTEND_URL=https://$HOSTNAME#" /etc/shopsmart/api.env
else echo "FRONTEND_URL=https://$HOSTNAME" >> /etc/shopsmart/api.env; fi
