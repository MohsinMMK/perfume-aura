import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/ops-pack.yml", "utf8");
assert.equal(
  [...workflow.matchAll(/persist-credentials: false/g)].length,
  14,
  "every non-publishing checkout must discard credentials",
);

function jobBody(jobName, nextJobName) {
  const startMarker = `  ${jobName}:\n`;
  const start = workflow.indexOf(startMarker);
  assert.notEqual(start, -1, `missing ${jobName} job`);
  const end = nextJobName
    ? workflow.indexOf(`  ${nextJobName}:\n`, start + startMarker.length)
    : workflow.length;
  assert.notEqual(end, -1, `missing ${nextJobName} job after ${jobName}`);
  return workflow.slice(start, end);
}

assert.match(workflow, /^name: ci-and-ops-artifact$/m);
assert.doesNotMatch(workflow, /deploy-hostinger-storefront-archive|storefront:pack|HOSTINGER_STOREFRONT_ARCHIVE/);
for (const [, databaseName] of workflow.matchAll(/POSTGRES_DB:\s*([^\s},]+)/g)) {
  assert.match(databaseName, /^perfume_aura_phase\d{2}_[a-z0-9]+(?:_[a-z0-9]+)*$/);
}

const scope = jobBody("scope", "repository-contracts");
assert.match(scope, /validate_ops:/);
assert.match(scope, /validate_storefront:/);
assert.match(scope, /should_validate:/);
assert.match(scope, /PULL_REQUEST_BASE_SHA/);
assert.match(scope, /--base "\$BASE_SHA" --head "\$GITHUB_SHA"/);

const storefront = jobBody("storefront-quality", "ops-quality");
assert.match(storefront, /needs\.scope\.outputs\.validate_storefront == 'true'/);
assert.doesNotMatch(storefront, /build:ops|@perfume-aura\/ops/);

const ops = jobBody("ops-quality", "dependency-audit");
assert.match(ops, /needs\.scope\.outputs\.validate_ops == 'true'/);
assert.doesNotMatch(ops, /build:storefront|@perfume-aura\/storefront/);

const quality = jobBody("quality", "publish-and-deploy-vps-ops");
assert.match(quality, /if: always\(\)/);
assert.match(quality, /STOREFRONT_SOURCE_BUILD/);
assert.match(quality, /OPS_PACKAGE/);

const promotion = jobBody("promote-hostinger-storefront-source", "verify-hostinger-storefront");
assert.match(promotion, /needs:\n\s+- scope\n\s+- quality\n\s+- storefront-source-build/);
assert.match(promotion, /always\(\)/);
assert.match(promotion, /needs\.quality\.result == 'success'/);
assert.match(promotion, /needs\.storefront-source-build\.result == 'success'/);
assert.match(promotion, /hostinger-storefront-production/);
assert.match(promotion, /HOSTINGER_STOREFRONT_GIT_DEPLOY_ENABLED/);

const sourceBuild = jobBody("storefront-source-build", "ops-package");
assert.match(sourceBuild, /upload-artifact/);
assert.match(sourceBuild, /deploy\/storefront-vps\/Dockerfile/);
assert.match(sourceBuild, /sha256sum storefront-standalone/);

const databaseContext = jobBody("database-required-context", "package-required-context");
assert.match(databaseContext, /name: postgresql-16-integration/);
assert.match(databaseContext, /if: always\(\)/);

const packageContext = jobBody("package-required-context", "quality");
assert.match(packageContext, /name: verified-hostinger-zip/);
assert.match(packageContext, /if: always\(\)/);
assert.match(packageContext, /STOREFRONT_SOURCE_BUILD/);
assert.match(packageContext, /OPS_PACKAGE/);
assert.match(packageContext, /if \[\[ "\$1" == true \]\]; then/);

const opsDeploy = jobBody("publish-and-deploy-vps-ops", "block-runtime-deploy-on-database-migration");
assert.match(opsDeploy, /needs:\n\s+- scope\n\s+- quality\n\s+- ops-package/);
assert.match(opsDeploy, /always\(\)/);
assert.match(opsDeploy, /needs\.quality\.result == 'success'/);
assert.match(opsDeploy, /needs\.ops-package\.result == 'success'/);
assert.match(opsDeploy, /ops-standalone-/);

const migrationBlocker = jobBody("block-runtime-deploy-on-database-migration", "publish-and-deploy-vps-storefront");
assert.match(migrationBlocker, /always\(\)/);
assert.match(migrationBlocker, /needs\.quality\.result == 'success'/);

const storefrontVerification = jobBody("verify-hostinger-storefront", null);
assert.match(storefrontVerification, /always\(\)/);
assert.match(storefrontVerification, /needs\.promote-hostinger-storefront-source\.result == 'success'/);

const promotionCheckout = promotion.match(/Checkout the exact accepted source[\s\S]*?Advance the protected Hostinger source branch/)?.[0];
assert.ok(promotionCheckout, "missing promotion checkout");
assert.doesNotMatch(promotionCheckout, /persist-credentials: false/);

const storefrontDeploy = jobBody("publish-and-deploy-vps-storefront", "promote-hostinger-storefront-source");
for (const required of [
  "needs.quality.result == 'success'", "needs.storefront-source-build.result == 'success'",
  "needs.scope.outputs.publish_storefront == 'true'", "needs.scope.outputs.ops_migration_blocked != 'true'",
  "needs.scope.outputs.publish_ops != 'true'",
  "VPS_STOREFRONT_AUTO_DEPLOY_ENABLED", "VPS_STOREFRONT_SSH_KEY",
  "perfume-storefront-deploy@", "StrictHostKeyChecking=yes", "--target storefront",
]) assert.ok(storefrontDeploy.includes(required), `missing storefront gate: ${required}`);
assert.doesNotMatch(storefrontDeploy, /perfume-deploy@|VPS_OPS_SSH_KEY|--target ops/);

process.stdout.write("ci-workflow contract ok\n");
