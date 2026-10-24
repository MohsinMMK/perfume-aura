# PostgreSQL and pgBackRest must run in the same container: PostgreSQL invokes
# pgBackRest from archive_command for every WAL segment. Build against the same
# Debian base as PostgreSQL instead of copying an opaque foreign binary.
ARG PGBACKREST_VERSION=2.60.0
ARG PGBACKREST_SOURCE_SHA256=6d3ee1b5defdadc85228969b4be804096f5e65e54707bb95c7c4c4ce41f5d007

# This immutable multi-architecture index selects the exact Linux image for the
# VPS architecture. Keep it synchronized with postgres-image.lock and verify it
# before a VPS build; never replace it with a mutable Docker tag.
FROM postgres:18.6-trixie@sha256:edb0c08dc33befd0262ab3b5cf1c4f3f8cfd8b09e88c05b45adee29d6761ddb6 AS postgres-base

FROM postgres-base AS pgbackrest-build

ARG PGBACKREST_VERSION
ARG PGBACKREST_SOURCE_SHA256

RUN set -eux; \
    apt-get update; \
    apt-get install --yes --no-install-recommends \
      build-essential \
      ca-certificates \
      curl \
      libbz2-dev \
      liblz4-dev \
      libpq-dev \
      libssh2-1-dev \
      libssl-dev \
      libsystemd-dev \
      libxml2-dev \
      libzstd-dev \
      meson \
      ninja-build \
      pkg-config \
      zlib1g-dev; \
    curl --fail --location --silent --show-error \
      --output /tmp/pgbackrest.tar.gz \
      "https://github.com/pgbackrest/pgbackrest/releases/download/release/${PGBACKREST_VERSION}/pgbackrest-${PGBACKREST_VERSION}.tar.gz"; \
    echo "${PGBACKREST_SOURCE_SHA256}  /tmp/pgbackrest.tar.gz" | sha256sum --check --status; \
    mkdir /tmp/pgbackrest-source; \
    tar --extract --gzip --file /tmp/pgbackrest.tar.gz --strip-components=1 --directory /tmp/pgbackrest-source; \
    meson setup /tmp/pgbackrest-build /tmp/pgbackrest-source --prefix=/usr/local; \
    ninja -C /tmp/pgbackrest-build; \
    meson install --no-rebuild --destdir /tmp/pgbackrest-install -C /tmp/pgbackrest-build; \
    /tmp/pgbackrest-install/usr/local/bin/pgbackrest version

FROM postgres-base

ARG POSTGRES_SECRETS_GID

RUN set -eux; \
    apt-get update; \
    apt-get install --yes --no-install-recommends \
      libbz2-1.0 \
      liblz4-1 \
      libpq5 \
      libssh2-1t64 \
      libssl3t64 \
      libsystemd0 \
      libxml2 \
      libzstd1 \
      zlib1g; \
    rm -rf /var/lib/apt/lists/*

COPY --from=pgbackrest-build /tmp/pgbackrest-install/usr/local/bin/pgbackrest /usr/local/bin/pgbackrest

RUN set -eux; \
    /usr/local/bin/pgbackrest version; \
    # Fresh spool and repository volumes copy these from the image; pgBackRest
    # creates none of them.
    install --directory --owner=postgres --group=postgres --mode=0700 \
      /var/lib/pgbackrest /var/lib/pgbackrest/log /var/lib/pgbackrest/spool \
      /var/lib/pgbackrest-repo; \
    # The entrypoint's gosu drop keeps only /etc/group memberships, so Compose
    # group_add cannot reach archive_command. Bake the secret-reader group in.
    test -n "${POSTGRES_SECRETS_GID}"; \
    test "${POSTGRES_SECRETS_GID}" -gt 0; \
    groupadd --gid "${POSTGRES_SECRETS_GID}" perfume-aura-secrets; \
    usermod --append --groups perfume-aura-secrets postgres
