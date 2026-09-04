# Storefront VPS

[Operations](../../docs/OPERATIONS.md#storefront-deployment-and-recovery) owns
setup, secrets, deployment, cutover and recovery. [Current state](../../docs/CURRENT_STATE.md)
owns what is actually live. Do not confuse installed preparation with production.

| File | Responsibility |
|---|---|
| `Dockerfile` | Reject wrong/dirty artifacts; run the exact Linux standalone as non-root |
| `compose.yaml` | Production service on loopback 3031 with separate root-owned runtime env |
| `deploy-ssh.sh` | Accept only probe or exact SHA/digest deployment commands |
| `deploy-root.sh` | Serialized pull/provenance/health verification and failed-start recovery |
| `sudoers` | Storefront deploy user may invoke only the validating root command |
| `sshd.conf` | Add only the storefront identity to the existing SSH allowlist |
| `test-contract.mjs` | Isolation, release-lock and command-injection regression checks |
| `compose.preview.yaml` | Secret-free loopback 3030 trial; remove after production acceptance |

Build from a clean Linux x64/glibc checkout:

```bash
bash scripts/build-hostinger-storefront-source.sh
docker build --platform linux/amd64 --build-arg SOURCE_COMMIT=<full-sha> \
  -f deploy/storefront-vps/Dockerfile \
  -t ghcr.io/mohsinmmk/perfume-aura-storefront:<full-sha> .hostinger/storefront
node deploy/storefront-vps/test-contract.mjs
bash -n deploy/storefront-vps/deploy-root.sh deploy/storefront-vps/deploy-ssh.sh
```

Use only the generated standalone directory as Docker context. Production
deployments require immutable registry digests; the private preview may use a
verified local image ID with `--pull never`. Never copy Ops env, mount Docker
socket, expose an app port publicly or widen sudo to arbitrary commands.
