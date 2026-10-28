# Build from the repository root at the exact release commit.
# pg_dump/psql must be at least the server major version; PostgreSQL 18 client
# tools also serve the current Neon server. Node comes from the pinned runtime image.
FROM node:26.12.1-trixie-slim@sha256:94816674c62774da0d099a947bf4613b9e1972a2733abd0d0cd80e795f8411d0 AS node-runtime

FROM node-runtime AS dependencies
WORKDIR /app/runner
COPY deploy/database-release-vps/runner/package.json deploy/database-release-vps/runner/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

FROM postgres:18.6-trixie@sha256:979bccfde35445db618c65107d27d08c6c21339d8dc3ad4c830c6633947be0e4

ARG SOURCE_COMMIT
LABEL org.opencontainers.image.source="https://github.com/MohsinMMK/perfume-aura" \
      org.opencontainers.image.revision="${SOURCE_COMMIT}"

COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
# Node 26 links libatomic, which the PostgreSQL image does not ship (amd64 only).
COPY --from=node-runtime /usr/lib/x86_64-linux-gnu/libatomic.so.1.2.0 /usr/lib/x86_64-linux-gnu/
RUN ln -s libatomic.so.1.2.0 /usr/lib/x86_64-linux-gnu/libatomic.so.1
RUN groupadd --system --gid 10001 perfume-aura \
  && useradd --system --uid 10001 --gid perfume-aura --home-dir /nonexistent --shell /usr/sbin/nologin perfume-aura
WORKDIR /app
COPY --from=dependencies /app/runner/node_modules runner/node_modules
COPY deploy/database-release-vps/runner/package.json deploy/database-release-vps/runner/release.mjs runner/
COPY packages/db/drizzle drizzle
COPY packages/db/sql/ops-runtime-grants.sql packages/db/sql/storefront-runtime-grants.sql packages/db/sql/storefront-payment-finalizer-grants.sql sql/
RUN SOURCE_COMMIT="${SOURCE_COMMIT}" node -e 'const a=require("node:assert/strict");a.match(process.env.SOURCE_COMMIT,/^[a-f0-9]{40}$/);require("node:fs").writeFileSync("/app/source-manifest.json",JSON.stringify({application:"@perfume-aura/database-release",source:{commit:process.env.SOURCE_COMMIT,dirty:false},secretsIncluded:false}))' \
  && node runner/release.mjs self-test \
  && pg_dump --version | grep -q ' 18\.'

USER 10001:10001
ENTRYPOINT ["node", "/app/runner/release.mjs"]
