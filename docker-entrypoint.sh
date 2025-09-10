#!/usr/bin/env sh
set -e

# Derive API base from runtime env vars
# Priority: PUBLIC_API_BASE > VITE_API_URL > empty (use relative /api)
API_BASE="${PUBLIC_API_BASE:-${VITE_API_URL:-}}"

# Trim trailing slash
API_BASE="$(printf "%s" "$API_BASE" | sed 's#/*$##')"

mkdir -p /var/www/html

cat > /var/www/html/config.js <<EOF
// Generated at container start
window.ENV_API_BASE = ${API_BASE:+"$API_BASE"};
EOF

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf


