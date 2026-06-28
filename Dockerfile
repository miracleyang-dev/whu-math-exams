# Railway 部署用 Dockerfile：静态 Caddy 站点，不再依赖 Git LFS。

FROM caddy:2-alpine

WORKDIR /srv

COPY . .

# Caddy 配置
COPY Caddyfile /etc/caddy/Caddyfile

# Railway 注入 $PORT；Caddyfile 里已写 :{$PORT}
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
