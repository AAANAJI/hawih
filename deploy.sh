#!/usr/bin/env bash
# ============================================================
#  Hawih site deploy — run from your Mac (SSH works there).
#  The Claude sandbox can't (port 22 blocked); your machine can.
#
#  One-time:
#    git clone https://github.com/aaanaji/hawih.git /Users/Anaji/Documents/Hawih
#    brew install hudochenkov/sshpass/sshpass     # or use an SSH key
#
#  Every deploy:
#    cd /Users/Anaji/Documents/Hawih
#    git pull
#    SSHPASS='your-server-password' ./deploy.sh
#       (or just ./deploy.sh — it will prompt once)
#
#  Overrides (optional):
#    HAWIH_DOCROOT=/var/www/hawih-site HAWIH_HOST=108.61.89.48 \
#    HAWIH_USER=root HAWIH_PORT=22 ./deploy.sh
#
#  Safe: backs up the live site, refuses to write if the target
#  looks like the Rise CRM, and never references the CRM vhost.
# ============================================================
set -euo pipefail

HOST="${HAWIH_HOST:-108.61.89.48}"
USER="${HAWIH_USER:-root}"
PORT="${HAWIH_PORT:-22}"
DOCROOT="${HAWIH_DOCROOT:-/var/www/hawih-site}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# One auth prompt for the whole run (connection multiplexing)
COMMON="-o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 \
-o ControlMaster=auto -o ControlPath=/tmp/.hawih-ssh-%C -o ControlPersist=120 -p $PORT"

if [ -n "${SSHPASS:-}" ]; then
  command -v sshpass >/dev/null || { echo "Need sshpass: brew install hudochenkov/sshpass/sshpass (or set up an SSH key and unset SSHPASS)"; exit 1; }
  export SSHPASS
  RSH="sshpass -e ssh $COMMON"
else
  RSH="ssh $COMMON"
fi
run_ssh() { eval "$RSH \"\$USER@\$HOST\" \"\$1\""; }

echo "==> Target: $USER@$HOST:$DOCROOT (port $PORT)"

echo "==> nginx vhost roots (read-only sanity check):"
run_ssh "grep -RsE 'server_name|root ' /etc/nginx/sites-enabled/ 2>/dev/null | grep -iE 'hawih|crm|root ' | head -40" || true

echo "==> Safety gate — must be the static site, NOT the CRM"
if ! run_ssh "test -d '$DOCROOT' && test -f '$DOCROOT/index.html' && ! test -d '$DOCROOT/application' && ! test -f '$DOCROOT/system/core/CodeIgniter.php'"; then
  echo "ABORT: $DOCROOT failed the safety check (no index.html, or it looks like the CRM). Nothing changed."
  exit 1
fi

echo "==> Backup current live site"
run_ssh "tar czf /root/hawih-backup-\$(date +%F-%H%M%S).tgz -C '$DOCROOT' . && ls -1t /root/hawih-backup-*.tgz | head -1"

echo "==> rsync site -> server (CRM untouched)"
rsync -az --delete \
  --exclude='.git' --exclude='.github' --exclude='reference/' \
  --exclude='*.md' --exclude='CRM_INTEGRATION_PLAYBOOK*' --exclude='DEPLOY*' \
  --exclude='deploy.sh' --exclude='.well-known/' --exclude='uploads/' --exclude='.user.ini' \
  -e "$RSH" \
  "$SRC_DIR"/ "$USER@$HOST:$DOCROOT/"

echo "==> Permissions + leads log + nginx reload"
run_ssh "bash -s" <<EOF
set -e
chown -R www-data:www-data "$DOCROOT"
find "$DOCROOT" -type f -exec chmod 644 {} \;
find "$DOCROOT" -type d -exec chmod 755 {} \;
mkdir -p /var/log/hawih-leads
chown www-data:www-data /var/log/hawih-leads
chmod 750 /var/log/hawih-leads
nginx -t && systemctl reload nginx
EOF

echo "==> Verify"
code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 https://hawih.com.sa/ || true)"
echo "https://hawih.com.sa/ -> $code"
[ "$code" = "200" ] && echo "✅ Deployed." || echo "⚠️  Home returned $code — check the site."
