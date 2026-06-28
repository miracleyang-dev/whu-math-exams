# Railway 部署用 Dockerfile：保留 Git LFS
# 之前用 nixpacks.toml / Build Command 都失败，因为 git-lfs 二进制不在 build 容器里。
# 这里用 caddy 官方镜像，alpine 上 apk 装 git+git-lfs，构建期把 LFS 指针换成真实 PDF。

FROM caddy:2-alpine

# git + git-lfs 用于把仓库里 LFS 指针换成真实 PDF
RUN apk add --no-cache git git-lfs

WORKDIR /srv

# 复制整个仓库（包括 .git，git lfs pull 需要）
COPY . .

# 拉 LFS 对象。公开仓库无需鉴权
RUN git lfs install --local && git lfs pull

# Caddy 配置
COPY Caddyfile /etc/caddy/Caddyfile

# Railway 注入 $PORT；Caddyfile 里已写 :{$PORT}
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
