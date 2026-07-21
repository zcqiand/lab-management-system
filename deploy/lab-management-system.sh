#!/bin/sh
# Usage: DOCKER_USERNAME=... DOCKER_PASSWORD=... sh lab-management-system.sh [VERSION]
# VERSION 默认 latest；tag 发布时由 CI 通过 DEPLOY_VERSION 环境变量传入。
# 前置：deploy 用户已加入 docker 组（见 setup-vps.sh）。
# Docker 密码只从环境变量读取，避免出现在远程命令行参数中。

set -eu

USERNAME="${DOCKER_USERNAME:-${1:-}}"
PASSWORD="${DOCKER_PASSWORD:-}"
VERSION="${DEPLOY_VERSION:-${2:-latest}}"
IMAGE="${USERNAME}/lab-management-system:${VERSION}"

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
  echo "Usage: DOCKER_USERNAME=... DOCKER_PASSWORD=... sh $0 [VERSION]" >&2
  exit 2
fi

echo "→ image: $IMAGE"
echo "→ docker login"
if ! printf '%s' "$PASSWORD" | docker login -u "$USERNAME" --password-stdin; then
  echo "docker login failed" >&2
  exit 1
fi

echo "→ docker pull"
docker pull "$IMAGE"

echo "→ docker stop & rm lab-management-system"
docker stop lab-management-system 2>/dev/null || true
docker rm lab-management-system 2>/dev/null || true

echo "→ docker run"
docker run --pull=always -d \
  --name lab-management-system \
  --restart unless-stopped \
  -p "127.0.0.1:8062:80" \
  "$IMAGE"
echo "→ docker image prune"
docker image prune -f

echo "→ docker ps"
docker ps --filter name=lab-management-system
echo "→ deploy done at $(date -u)"
