FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e

ARG SOURCE_COMMIT
LABEL org.opencontainers.image.source="https://github.com/MohsinMMK/perfume-aura" \
      org.opencontainers.image.revision="${SOURCE_COMMIT}"

RUN groupadd --system --gid 10001 perfume-aura \
  && useradd --system --uid 10001 --gid perfume-aura --home-dir /nonexistent --shell /usr/sbin/nologin perfume-aura

WORKDIR /app
COPY --chown=10001:10001 . /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

USER 10001:10001
EXPOSE 3000
CMD ["node", "apps/ops/server.js"]
