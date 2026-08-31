# PostgreSQL and pgBackRest must run in the same container: PostgreSQL invokes
# pgBackRest from archive_command for every WAL segment. Build against the same
# Debian base as PostgreSQL instead of copying an opaque foreign binary.
ARG PGBACKREST_VERSION=2.59.1
ARG PGBACKREST_SOURCE_SHA256=1cd522afc33b8ff846ef88c55dc238717c9c8817a4f6ca7c9f64887de9c7402d

# This immutable multi-architecture index selects the exact Linux image for the
# VPS architecture. Keep it synchronized with postgres-image.lock and verify it
# before a VPS build; never replace it with a mutable Docker tag.
FROM postgres:17.10-bookworm@sha256:9b18b78397054fce88a9552e9d5a3ad5bb7fd258c5b3cc1c5028e46373d6ea8f AS postgres-base

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
    ninja --directory /tmp/pgbackrest-build; \
    meson install --no-rebuild --destdir /tmp/pgbackrest-install -C /tmp/pgbackrest-build; \
    /tmp/pgbackrest-install/usr/local/bin/pgbackrest version

FROM postgres-base

RUN set -eux; \
    apt-get update; \
    apt-get install --yes --no-install-recommends \
      libbz2-1.0 \
      liblz4-1 \
      libpq5 \
      libssh2-1 \
      libssl3 \
      libsystemd0 \
      libxml2 \
      libzstd1 \
      zlib1g; \
    rm -rf /var/lib/apt/lists/*

COPY --from=pgbackrest-build /tmp/pgbackrest-install/usr/local/bin/pgbackrest /usr/local/bin/pgbackrest

RUN set -eux; \
    /usr/local/bin/pgbackrest version; \
    install --directory --owner=postgres --group=postgres --mode=0700 /var/lib/pgbackrest
