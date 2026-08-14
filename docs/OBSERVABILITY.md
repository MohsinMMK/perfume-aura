# Observability

This is the current operating contract for PostHog analytics and Sentry error,
performance, and structured-log monitoring. Neither service is a source of
truth for commerce, authentication, inventory, or finance.

## Provider layout

| Service | Cloud object | Application separation | Current provider state |
|---|---|---|---|
| PostHog US Cloud | Project `Perfume Aura Web` (ID `541869`) | Required event property `application=storefront` or `application=operations` | Free project exists; client IP storage is disabled |
| Sentry | Project `perfume-aura-storefront` in organization `khanect` | Dedicated storefront project | Free project exists; high-priority email alerts enabled |
| Sentry | Project `perfume-aura-ops` in organization `khanect` | Dedicated private-ops project | Free project exists; high-priority email alerts enabled |

The active PostHog free plan permits one project. Both web applications use
that project and must be filtered by the mandatory `application` property.
Sentry remains split because operational errors and public-storefront errors
have different access, urgency, and privacy boundaries.

## What each service does

- PostHog receives privacy-filtered page views and page leaves. Broad DOM
  autocapture, surveys, experiments, feature flags, exception capture, and
  session replay are disabled in the SDK. It answers questions about which
  application and routes are used without collecting form values.
- Sentry receives unhandled browser, React, server, route, and Edge errors;
  sampled performance traces; and explicitly emitted structured logs. It groups
  failures into issues and connects production stack frames to a release when
  authenticated CI source-map upload is configured.
- Sentry Logs are emitted only through the approved typed helpers. Console
  capture is intentionally not enabled because raw console values may contain
  operational or customer data.

## Runtime wiring

Both applications contain the official Next.js instrumentation surfaces:

```text
instrumentation-client.ts
  -> Sentry browser errors + route transitions
  -> deferred PostHog initialization after page load

instrumentation.ts
  -> sentry.server.config.ts for Node
  -> sentry.edge.config.ts for Edge
  -> Next.js onRequestError hook

app/global-error.tsx
  -> captures root React failures and provides an accessible retry surface
```

Storefront and ops PostHog clients register the application property before
capturing page activity. Authenticated identification uses only the stable
internal user ID; email, name, phone, token, password, query/search values,
request bodies, cookies, and authorization headers are removed. Both PostHog
and Sentry URLs lose query strings and fragments, and opaque path tokens are
redacted. Operations logout and customer logout reset provider identity.

All SDKs fail closed: an empty project token or DSN produces no provider
traffic. PostHog loads dynamically during browser idle time so it does not
block application startup.

## Environment mapping

Use the same PostHog project token for both applications, with distinct
variable names so an accidental cross-app package cannot silently inherit it.
The token and Sentry DSNs are write-only/public client identifiers, but they
still belong in GitHub variables, platform runtime settings, or ignored local
environment files rather than committed source. Storefront server runtime
values live in Hostinger; ops server runtime values live in root-owned
`/etc/khanect/perfume-aura-ops.env` on the VPS. Repository variables
`POSTHOG_PROJECT_TOKEN`, `POSTHOG_HOST`, `STOREFRONT_SENTRY_DSN`, and
`OPS_SENTRY_DSN` currently supply the prebuilt browser bundles.

| Application | Runtime variables |
|---|---|
| Storefront | `NEXT_PUBLIC_STOREFRONT_POSTHOG_TOKEN`, `NEXT_PUBLIC_STOREFRONT_POSTHOG_HOST`, `NEXT_PUBLIC_STOREFRONT_SENTRY_DSN`, `STOREFRONT_SENTRY_DSN`, `NEXT_PUBLIC_STOREFRONT_SENTRY_TRACES_SAMPLE_RATE`, `STOREFRONT_SENTRY_TRACES_SAMPLE_RATE` |
| Operations | `NEXT_PUBLIC_OPS_POSTHOG_TOKEN`, `NEXT_PUBLIC_OPS_POSTHOG_HOST`, `NEXT_PUBLIC_OPS_SENTRY_DSN`, `OPS_SENTRY_DSN`, `NEXT_PUBLIC_OPS_SENTRY_TRACES_SAMPLE_RATE`, `OPS_SENTRY_TRACES_SAMPLE_RATE` |

Use `https://us.i.posthog.com` for both PostHog host variables. Start both
trace sample rates at `0.1`; adjust only from measured volume and incident
needs.

Authenticated CI builds additionally require:

```text
SENTRY_ORG=khanect
STOREFRONT_SENTRY_PROJECT=perfume-aura-storefront
OPS_SENTRY_PROJECT=perfume-aura-ops
SENTRY_AUTH_TOKEN=<CI secret only>
```

GitHub Actions currently has `SENTRY_AUTH_TOKEN` as a repository secret created
with Sentry's limited `org:ci` scope. Never copy it into Hostinger or a
`NEXT_PUBLIC_*` variable.

The build uploads source maps only when the organization, application project,
and auth token are all present. Otherwise builds remain valid and source-map
upload is disabled. Uploaded browser source maps are deleted from the build
output afterward. The credential is exposed only to the verified package job on
`main`; pull-request and ordinary quality builds do not receive it.

## Setup verification baseline

On 2026-08-04, controlled non-production connection events reached both
Sentry projects and the shared PostHog project. PostHog showed one event with
`application=storefront` and one with `application=operations`; Sentry showed
one event in each matching application project. The temporary Sentry issues
were resolved after verification, leaving both unresolved issue feeds clean.

Both applications also passed production builds with the provider identifiers
enabled. Route client-JavaScript measurements were compared with a clean
`origin/main` build and did not increase on any guarded storefront or ops
route. The stricter budget scripts from the separate optimization branch are
not part of `main`, so this comparison is regression evidence rather than a
claim that those later thresholds are release gates here. The result proves
the SDK wiring and cloud ingestion path, but it is not a production activation
or a source-map verification against a deployed release.

## Activation and verification

Treat observability activation as an explicit deployment on each platform. The
historical Hostinger duplicate-process/NPROC incident still gates storefront
provider changes, but it no longer blocks an independently authorized VPS ops
deployment:

1. Add the storefront server-only Sentry values in Hostinger and the ops
   server-only Sentry values in `/etc/khanect/perfume-aura-ops.env`. The
   `NEXT_PUBLIC_*` values must be present during the prebuilt CI/package build
   and cannot be added after the artifact is built.
2. Confirm the existing build-only `SENTRY_AUTH_TOKEN` secret is available to
   the trusted main-branch build; never expose it to pull requests from forks
   or through `NEXT_PUBLIC_`.
3. Run `pnpm check`, `pnpm test:integration`, both package commands, and
   `git diff --check`.
4. Deploy through the existing verified paths and run the exact-SHA production
   verifier plus the full storefront and ops smoke tests.
5. In a controlled, non-sensitive test route, produce one handled test error
   per application. Confirm the issue, structured log, release, readable stack,
   and `application` tag in the correct Sentry project.
6. Confirm a page view from each application in PostHog and filter by
   `application`. Verify that the event URL has no query string and the person
   contains no email or name.
7. Reconfirm PostHog IP discard remains enabled and that no session recordings
   are created.

No production readiness claim is valid until the provider event and source-map
checks pass. Monitoring must not open a storefront commerce flag or the staff
security flags.
