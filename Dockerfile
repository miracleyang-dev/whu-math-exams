# Railway's GitHub deploy can provide Git LFS pointer files in the Docker
# context. Hydrate the public repository's PDF objects in a build stage, then
# copy the real files into the final Caddy image.
FROM alpine:3.20 AS lfs

ARG RAILWAY_GIT_COMMIT_SHA
ARG RAILWAY_GIT_BRANCH=main
ARG RAILWAY_GIT_REPO_OWNER=miracleyang-dev
ARG RAILWAY_GIT_REPO_NAME=whu-math-exams

RUN apk add --no-cache ca-certificates git git-lfs

WORKDIR /src

RUN set -eux; \
    git lfs install --skip-repo; \
    git clone --filter=blob:none --no-checkout "https://github.com/${RAILWAY_GIT_REPO_OWNER}/${RAILWAY_GIT_REPO_NAME}.git" .; \
    if [ -n "${RAILWAY_GIT_COMMIT_SHA:-}" ]; then \
      git fetch --depth 1 origin "${RAILWAY_GIT_COMMIT_SHA}"; \
      GIT_LFS_SKIP_SMUDGE=1 git checkout --detach "${RAILWAY_GIT_COMMIT_SHA}"; \
    else \
      GIT_LFS_SKIP_SMUDGE=1 git checkout "${RAILWAY_GIT_BRANCH:-main}"; \
    fi; \
    git lfs pull --include="exams/**" --exclude=""; \
    pdf_count="$(find exams -type f -name '*.pdf' | wc -l | tr -d ' ')"; \
    [ "${pdf_count}" -gt 0 ]; \
    find exams -type f -name '*.pdf' -exec sh -c 'for f do header="$(dd if="$f" bs=5 count=1 2>/dev/null)"; if [ "$header" != "%PDF-" ]; then echo "PDF was not hydrated from Git LFS: $f"; head -n 3 "$f"; exit 1; fi; done' sh {} +

FROM caddy:2-alpine

WORKDIR /srv

COPY . .
COPY --from=lfs /src/exams ./exams
COPY Caddyfile /etc/caddy/Caddyfile

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
