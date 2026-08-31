# Root-owned secret material

Nothing in this directory except the `*.example` files is committed. On the
VPS, place actual files in a root-owned directory outside the repository, such
as `/etc/perfume-aura-postgres/secrets`. Docker Compose reads each source file
as a Docker secret and mounts it only into the containers that need it.

Create the directory and files as root, then keep the directory `0700` and
every source file `0600`:

```bash
install -d -o root -g root -m 0700 /etc/perfume-aura-postgres/secrets
install -o root -g root -m 0600 /path/to/source /etc/perfume-aura-postgres/secrets/<target-name>
```

Every parent directory between `/` and this directory must be a non-symlink,
root-owned directory that group/other cannot write. The bootstrap verifies that
chain before it reads a secret, so a non-root account cannot swap a checked
file by renaming it through a writable ancestor.

Required files are listed in `../.env.example`. They are deliberately split so
that PostgreSQL, both poolers, pgBackRest, and pgAdmin receive only the material
they require.

Create the two PgBouncer userlist source files as empty root-private files
before the first Compose validation. The bootstrap fills them atomically with
SCRAM verifiers after it creates the restricted roles; do not hand-write
passwords or placeholder verifiers into them:

```bash
install -o root -g root -m 0600 /dev/null /etc/perfume-aura-postgres/secrets/pgbouncer-ops-userlist.txt
install -o root -g root -m 0600 /dev/null /etc/perfume-aura-postgres/secrets/pgbouncer-storefront-userlist.txt
```

`postgres-superuser-password` is also the input for the direct owner bootstrap
connection. The direct URL must not contain a password; the bootstrap reads this
root-owned file into a short-lived `PGPASSWORD` environment variable instead.

`ops-runtime-password`, `storefront-runtime-password`, and
`storefront-payment-finalizer-password` are input only for
`../bootstrap/bootstrap-runtime-roles.sh`. It reads them into a short-lived
process environment, creates SCRAM role verifiers, then atomically writes each
verifier (never a clear-text password) to its own file. The private userlist
contains only `ops_runtime`; the public userlist contains only
`storefront_runtime` and `storefront_payment_finalizer`. All four PostgreSQL
role-secret files—including `postgres-superuser-password`—must contain
different values. The bootstrap checks each pair in memory and reports only
the file labels if a collision is found; a shared storefront/finalizer secret
would otherwise allow the normal storefront credential to authenticate as the
payment-finalizer role.

`pgbackrest.conf` contains the off-host repository credentials and its backup
cipher passphrase. It is not an application connection string and must never be
copied into a GitHub secret, deployment archive, logs, or `CURRENT_STATE.md`.

For the public pooler, generate a private certificate authority offline and
issue distinct client certificates for the storefront and any break-glass tool.
The CA certificate in this directory is the public verification root that
PgBouncer uses; the CA private key stays offline and never reaches the VPS.
