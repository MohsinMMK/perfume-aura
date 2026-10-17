FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20

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
