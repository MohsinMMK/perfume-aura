# Database release VPS

[Operations](../../docs/OPERATIONS.md#automated-database-release) owns enablement,
install and recovery. [Current state](../../docs/CURRENT_STATE.md) owns whether
it is enabled. Installed files are not proof that production uses them.

| File | Responsibility |
|---|---|
| `runner/release.mjs` | Plan, backup, single-transaction migrate, re-grant and privilege verification |
| `Dockerfile` | Immutable image: exact migrations, grant SQL, pg_dump 18 and the runner as UID 10001 |
| `release-ssh.sh` | Accept only probe or exact SHA/digest release commands |
| `release-root.sh` | Serialized pull/provenance check, pre-release dump, release and state record |
| `sudoers` | Release user may invoke only the validating root command |
| `sshd.conf` | Add only the release identity to the existing SSH allowlist |
| `release.env.example` | Names of the root-only env file values |
| `test-contract.mjs` | Command-injection, isolation and pinned-image regression checks |

The runner refuses before writing when:

- the owner URL is a pooler;
- the runtime roles are missing, shared or privileged (PUBLIC grants count);
- the recorded history is missing, diverges from the journal or is newer than the image;
- a pending migration has unreviewed destructive SQL outside routine bodies:
  drops, renames, type changes, `TRUNCATE`, `DELETE` or `UPDATE … SET`. An empty
  (owner-created) history is a first bootstrap with no data, so it is exempt.

After applying, any row a grant script's drift query returns fails the release.

A migration may opt in to destructive SQL only with the reviewed line
`-- perfume-aura: destructive-change-reviewed`. Pending migrations apply in one
transaction with a 15 s lock timeout, so a failure leaves no partial schema.
Grants then run again on every release.

Build and check from a clean checkout (context is the repository root):

```bash
docker build --platform linux/amd64 --build-arg SOURCE_COMMIT=<full-sha> \
  -f deploy/database-release-vps/Dockerfile \
  -t ghcr.io/mohsinmmk/perfume-aura-database-release:<full-sha> .
node deploy/database-release-vps/test-contract.mjs
bash -n deploy/database-release-vps/release-root.sh deploy/database-release-vps/release-ssh.sh
```

Never put the owner URL in GitHub, widen sudo to arbitrary commands, mount the
Docker socket or let the release user write the root command, sudoers or env file.
