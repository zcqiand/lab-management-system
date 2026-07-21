#!/bin/sh
# setup-vps.sh — VPS 一次性 bootstrap（Ubuntu/Debian）
# 用法：sudo sh deploy/setup-vps.sh lab.example.com
#
# 脚本只负责安装运行时和准备目录，不接触证书或 SSH 私钥。
# GitHub Actions 所需 secrets 仍需在仓库设置中配置。

set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "请以 root 运行：sudo sh deploy/setup-vps.sh <域名>" >&2
  exit 1
fi

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <your-domain.example.com>" >&2
  exit 1
fi

log() {
  printf '→ %s\n' "$*"
}

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
DEPLOY_DIR="/home/deploy/lab-management-system"
CERT_FILE="/etc/nginx/ssl/your-cert.crt"
KEY_FILE="/etc/nginx/ssl/your-cert.key"

# ── 1. 系统包 ─────────────────────────────────────
if ! command -v nginx >/dev/null 2>&1; then
  log "install nginx"
  apt-get update
  apt-get install -y nginx
fi
if ! command -v docker >/dev/null 2>&1; then
  log "install docker"
  apt-get update
  apt-get install -y docker.io
fi

# ── 2. deploy 用户 ────────────────────────────────
if ! id deploy >/dev/null 2>&1; then
  log "create deploy user"
  adduser --disabled-password --gecos "" --shell /bin/bash deploy
fi
log "ensure deploy in docker group"
usermod -aG docker deploy
cat > /etc/sudoers.d/deploy-nginx <<'SUDO'
deploy ALL=(root) NOPASSWD: /usr/sbin/nginx -s reload
SUDO
chmod 440 /etc/sudoers.d/deploy-nginx

# ── 3. 部署目录和脚本 ─────────────────────────────
log "create $DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"
chown deploy:deploy "$DEPLOY_DIR"
if [ -f "$SCRIPT_DIR/lab-management-system.sh" ]; then
  install -o deploy -g deploy -m 0755 \
    "$SCRIPT_DIR/lab-management-system.sh" \
    "$DEPLOY_DIR/lab-management-system.sh"
fi
mkdir -p /etc/nginx/ssl
chmod 700 /etc/nginx/ssl

# ── 4. 渲染 nginx vhost ───────────────────────────
TEMPLATE="$SCRIPT_DIR/nginx-vps.conf.example"
if [ ! -f "$TEMPLATE" ]; then
  echo "Missing template: $TEMPLATE" >&2
  exit 2
fi
TARGET="/etc/nginx/sites-available/$DOMAIN"
log "render → $TARGET"
sed "s/YOUR_DOMAIN/$DOMAIN/g" "$TEMPLATE" > "$TARGET"

# 证书由运维人员单独放置。没有证书时先不启用 HTTPS vhost，避免 nginx -t
# 因找不到私钥失败；证书就位后重新运行本脚本即可启用并 reload。
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
  log "enable nginx site"
  ln -sf "$TARGET" "/etc/nginx/sites-enabled/$DOMAIN"
  rm -f /etc/nginx/sites-enabled/default
  log "nginx -t"
  nginx -t
  log "reload nginx"
  systemctl reload nginx
else
  log "证书尚未就位，暂不启用 $DOMAIN"
  log "请放置 $CERT_FILE 和 $KEY_FILE 后重新运行本脚本"
fi

log "VPS 配置完成"
log "GitHub Secrets: DOCKER_USERNAME / DOCKER_PASSWORD / VPS_HOST / VPS_USER / VPS_SSH_KEY"
