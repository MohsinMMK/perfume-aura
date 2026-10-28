FROM node:26.12.1-trixie-slim@sha256:94816674c62774da0d099a947bf4613b9e1972a2733abd0d0cd80e795f8411d0

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
