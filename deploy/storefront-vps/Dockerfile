# Build with the verified Linux standalone directory as the context, not the repo.
FROM node:24.6.0-bookworm-slim@sha256:9b741b28148b0195d62fa456ed84dd6c953c1f17a3761f3e6e6797a754d9edff

ARG SOURCE_COMMIT
LABEL org.opencontainers.image.source="https://github.com/MohsinMMK/perfume-aura" \
      org.opencontainers.image.revision="${SOURCE_COMMIT}"

RUN groupadd --system --gid 10001 perfume-aura \
  && useradd --system --uid 10001 --gid perfume-aura --home-dir /nonexistent --shell /usr/sbin/nologin perfume-aura
WORKDIR /app
COPY --chown=10001:10001 . /app
# Refuse an artifact from another app, a dirty checkout, or a different commit.
RUN SOURCE_COMMIT="${SOURCE_COMMIT}" node -e 'const a=require("node:assert/strict");const m=require("./source-manifest.json");a.match(process.env.SOURCE_COMMIT,/^[a-f0-9]{40}$/);a.equal(m.application,"@perfume-aura/storefront");a.equal(m.source.commit,process.env.SOURCE_COMMIT);a.equal(m.source.dirty,false);a.equal(m.secretsIncluded,false);a.equal(m.entry,"apps/storefront/server.js");a.deepEqual(m.runtime.target,{os:"linux",cpu:"x64",libc:"glibc"});require.resolve("next",{paths:["/app/apps/storefront"]});'

ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
USER 10001:10001
EXPOSE 3000
CMD ["node", "apps/storefront/server.js"]
