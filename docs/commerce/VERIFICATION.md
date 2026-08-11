# Commerce verification

Verification is rerunnable evidence, not a planning statement or rendered page.
Never record secrets, customer data, credentials, or private provider payloads.

## Foundation check

```bash
pnpm commerce:verify
```

The check validates:

- all eight commerce documents and their relative links;
- the retained source PDF digest and 103-row transcription;
- requirement and decision IDs;
- 103 launch products and 288 approved product/size rows;
- standard INR prices and blocked Signature prices;
- reference-mapping counts, evidence provenance, and locked identity digest;
- fail-closed legal, packaging, content, media, SKU, cost, and stock states.

It does not prove external URL reachability, legal clearance, merchant approval,
production flags, customer journeys, or a live payment lifecycle.

## Change evidence

For a completed requirement, record:

```text
requirement ID
implementation path or migration
automated command and result
manual/provider evidence when required
commit and artifact checksum when applicable
verification time
residual risk
```

Database, auth, inventory, order, payment, and release changes also require the
relevant unit/integration tests, production build/package proof, browser QA,
accessibility checks, and the deployment smoke in
[`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md).

A requirement remains Proposed or Blocked until every acceptance criterion is
proven. A unit test or page render never substitutes for provider, policy,
legal, or end-to-end evidence.

## Release record

```text
release identifier and Git SHA
artifact filename and SHA-256
database migration and runtime-grant state
catalog publication count
automated and browser results
payment and inventory reconciliation
deployment target and live smoke
rollback procedure
residual risks and verifier
```
