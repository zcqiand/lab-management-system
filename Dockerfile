# 多阶段构建：先构建前端产物，再用 nginx serve
# ch38：部署配置，生产用 nginx 托管 SPA

# —— Stage 1: build ——
FROM node:20-alpine AS build
WORKDIR /app

# 利用 docker 层缓存：先拷 lock 文件安装依赖
COPY package.json package-lock.json ./
RUN npm ci

# 拷源码构建
COPY . .
RUN npm run build

# —— Stage 2: serve ——
FROM nginx:alpine AS serve

# 拷贝自定义 nginx 配置（SPA fallback）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝构建产物
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# nginx 默认 CMD 即 daemon off，无需覆盖
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1
