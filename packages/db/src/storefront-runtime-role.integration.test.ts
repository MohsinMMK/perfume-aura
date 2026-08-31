/**
 * A live privilege proof for the two self-hosted storefront database roles.
 *
 * This intentionally uses the reviewed psql grant scripts rather than
 * reproducing their SQL in TypeScript. It runs only against the repository's
 * disposable loopback database and creates randomized, non-inheriting roles
 * which are removed after the proof.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { after, before, describe, it } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool, type QueryResultRow } from "pg";
import { requireDisposableTestDatabaseUrl } from "./test-database-guard";

const testDatabaseUrl = requireDisposableTestDatabaseUrl();
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const storefrontGrantsPath = resolve(currentDirectory, "../sql/storefront-runtime-grants.sql");
const paymentFinalizerGrantsPath = resolve(
  currentDirectory,
  "../sql/storefront-payment-finalizer-grants.sql",
);
const orderAmountMinor = 240000;

type IdRow = QueryResultRow & { id: string };

type SeededCheckout = Readonly<{
  checkoutSessionId: string;
  orderId: string;
  paymentAttemptId: string;
  productId: string;
  providerOrderId: string;
  providerSessionId: string;
  variantId: string;
  oilLotId: string;
}>;

type FinalizerResultRow = QueryResultRow & {
  newly_finalized: boolean;
  order_id: string;
};

type BindingResultRow = QueryResultRow & {
  order_id: string;
  checkout_session_id: string;
  idempotent: boolean;
};

type CancellationResultRow = QueryResultRow & {
  order_id: string;
  checkout_session_id: string;
  released_count: number;
  idempotent: boolean;
};

type CatalogSnapshotRow = QueryResultRow & {
  public_name: string;
  sku: string;
  size_ml: number;
};

type SettledStateRow = QueryResultRow & {
  checkout_status: string;
  order_status: string;
  payment_state: string;
  payment_attempt_status: string;
  provider_payment_id: string | null;
  quantity_on_hand: number;
  qty_reserved: number;
  reservation_status: string;
  remaining_quantity_ml: number;
  stock_sale_count: string;
  oil_sale_count: string;
};

type PreBindingStateRow = QueryResultRow & {
  checkout_status: string;
  order_status: string;
  payment_state: string;
  payment_attempt_status: string;
  provider_order_id: string | null;
  provider_session_id: string | null;
  qty_reserved: number;
  remaining_quantity_ml: number;
  reserved_quantity_ml: number;
  oil_reservation_count: number;
};

type OilReservationStateRow = QueryResultRow & {
  remaining_quantity_ml: number;
  reserved_quantity_ml: number;
  reservation_quantity_ml: number;
  reservation_status: string;
  oil_sale_quantity_delta_ml: number | null;
};

function quoteIdentifier(value: string): string {
  assert.match(value, /^[a-z_][a-z0-9_]*$/);
  return `"${value}"`;
}

function databaseName(url: string): string {
  const parsed = new URL(url);
  const name = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  assert.match(name, /^perfume_aura_phase\d{2}_[a-z0-9]+(?:_[a-z0-9]+)*$/);
  return name;
}

function roleName(prefix: string): string {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 20);
  const name = `${prefix}_${suffix}`;
  assert.ok(name.length <= 63);
  assert.match(name, /^[a-z_][a-z0-9_]*$/);
  return name;
}

function rolePassword(): string {
  const password = randomUUID().replaceAll("-", "");
  assert.match(password, /^[a-f0-9]+$/);
  return password;
}

function connectionUrlForRole(url: string, user: string, password: string): string {
  const parsed = new URL(url);
  parsed.username = user;
  parsed.password = password;
  return parsed.toString();
}

function psqlEnvironment(url: string): NodeJS.ProcessEnv {
  const parsed = new URL(url);
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || "5432",
    PGDATABASE: decodeURIComponent(parsed.pathname.replace(/^\/+/, "")),
  };
  if (parsed.username) environment.PGUSER = decodeURIComponent(parsed.username);
  if (parsed.password) environment.PGPASSWORD = decodeURIComponent(parsed.password);
  return environment;
}

async function applyGrantScript(path: string, runtimeRole: string): Promise<void> {
  const output = await new Promise<Readonly<{ stdout: string; stderr: string }>>(
    (resolveOutput, rejectOutput) => {
      const child = spawn(
        "psql",
        [
          "-X",
          "-q",
          "-t",
          "-A",
          "-v",
          "ON_ERROR_STOP=1",
          "-v",
          `runtime_role=${runtimeRole}`,
          "-f",
          path,
        ],
        { env: psqlEnvironment(testDatabaseUrl) },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });
      child.once("error", rejectOutput);
      child.once("close", (exitCode, signal) => {
        if (exitCode === 0) {
          resolveOutput({ stdout, stderr });
          return;
        }
        rejectOutput(
          new Error(
            `psql grant application failed (${exitCode ?? "signal"}${signal ? `/${signal}` : ""}): ${stderr || stdout}`,
          ),
        );
      });
    },
  );

  assert.equal(
    output.stdout.trim(),
    "",
    `grant script reported privilege drift: ${output.stdout}`,
  );
  assert.equal(output.stderr.trim(), "", `grant script wrote diagnostics: ${output.stderr}`);
}

function isPermissionDenied(error: unknown): boolean {
  return Boolean(
    error
      && typeof error === "object"
      && "code" in error
      && (error as Readonly<{ code?: unknown }>).code === "42501",
  );
}

async function expectPermissionDenied(action: () => Promise<unknown>): Promise<void> {
  await assert.rejects(action, isPermissionDenied);
}

function isPostgresState(expected: string): (error: unknown) => boolean {
  return (error) => Boolean(
    error
      && typeof error === "object"
      && "code" in error
      && (error as Readonly<{ code?: unknown }>).code === expected,
  );
}

function isPostgresStateWithMessage(
  expected: string,
  message: RegExp,
): (error: unknown) => boolean {
  return (error) => Boolean(
    isPostgresState(expected)(error)
      && error
      && typeof error === "object"
      && "message" in error
      && typeof (error as Readonly<{ message?: unknown }>).message === "string"
      && message.test((error as Readonly<{ message: string }>).message),
  );
}

async function dropRoleIfPresent(ownerPool: Pool, role: string): Promise<void> {
  const result = await ownerPool.query<QueryResultRow & { exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS exists",
    [role],
  );
  if (!result.rows[0]?.exists) return;
  await ownerPool.query(`DROP OWNED BY ${quoteIdentifier(role)}`);
  await ownerPool.query(`DROP ROLE ${quoteIdentifier(role)}`);
}

async function seedCheckout(ownerPool: Pool): Promise<SeededCheckout> {
  const suffix = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60_000);
  const approvalAt = new Date();

  await ownerPool.query(
    `
      INSERT INTO public.commerce_settings (
        id, currency, flat_shipping_amount_minor, free_shipping_threshold_minor,
        tax_treatment, support_channel, shipping_policy_approved,
        returns_policy_approved, cancellation_policy_approved, checkout_enabled,
        tax_policy_approved, tax_approval_reference, catalog_legal_approved,
        legal_approval_reference, support_operations_approved
      )
      VALUES (
        'primary', 'INR', 0, 0, 'prices_include_approved_tax', 'integration-test',
        true, true, true, true, true, $1, true, $2, true
      )
      ON CONFLICT (id) DO UPDATE SET
        currency = EXCLUDED.currency,
        flat_shipping_amount_minor = EXCLUDED.flat_shipping_amount_minor,
        free_shipping_threshold_minor = EXCLUDED.free_shipping_threshold_minor,
        tax_treatment = EXCLUDED.tax_treatment,
        support_channel = EXCLUDED.support_channel,
        shipping_policy_approved = EXCLUDED.shipping_policy_approved,
        returns_policy_approved = EXCLUDED.returns_policy_approved,
        cancellation_policy_approved = EXCLUDED.cancellation_policy_approved,
        checkout_enabled = EXCLUDED.checkout_enabled,
        tax_policy_approved = EXCLUDED.tax_policy_approved,
        tax_approval_reference = EXCLUDED.tax_approval_reference,
        catalog_legal_approved = EXCLUDED.catalog_legal_approved,
        legal_approval_reference = EXCLUDED.legal_approval_reference,
        support_operations_approved = EXCLUDED.support_operations_approved,
        updated_at = now()
    `,
    [`tax-${suffix}`, `catalog-${suffix}`],
  );

  const product = await ownerPool.query<IdRow>(
    `
      INSERT INTO public.products (name, slug, status)
      VALUES ($1, $2, 'active')
      RETURNING id
    `,
    [`Restricted role test ${suffix}`, `restricted-role-test-${suffix}`],
  );
  const productId = product.rows[0]?.id;
  assert.ok(productId);

  const variant = await ownerPool.query<IdRow>(
    `
      INSERT INTO public.product_variants (
        product_id, sku, size_ml, cost_cents, retail_cents,
        quantity_on_hand, qty_reserved, reorder_level, status
      )
      VALUES ($1, $2, 50, 70000, 120000, 10, 0, 0, 'active')
      RETURNING id
    `,
    [productId, `ROLE-TEST-${suffix}`],
  );
  const variantId = variant.rows[0]?.id;
  assert.ok(variantId);

  await ownerPool.query(
    `
      INSERT INTO public.product_publications (
        product_id, public_name, public_slug, status,
        legal_approved_at, legal_approval_reference,
        content_approved_at, content_approval_reference,
        media_approved_at, media_approval_reference, published_at
      )
      VALUES ($1, $2, $3, 'published', $4, $5, $4, $6, $4, $7, $4)
    `,
    [
      productId,
      `Restricted role test ${suffix}`,
      `restricted-role-public-${suffix}`,
      approvalAt,
      `legal-${suffix}`,
      `content-${suffix}`,
      `media-${suffix}`,
    ],
  );
  await ownerPool.query(
    `
      INSERT INTO public.variant_prices (
        variant_id, currency, amount_minor, approved_at, approval_reference, active
      )
      VALUES ($1, 'INR', 120000, $2, $3, true)
    `,
    [variantId, approvalAt, `price-${suffix}`],
  );

  const cart = await ownerPool.query<IdRow>(
    `
      INSERT INTO public.commerce_carts (token_digest, expires_at)
      VALUES ($1, $2)
      RETURNING id
    `,
    [`cart-${suffix}`, expiresAt],
  );
  const cartId = cart.rows[0]?.id;
  assert.ok(cartId);

  const checkout = await ownerPool.query<IdRow>(
    `
      INSERT INTO public.checkout_sessions (
        cart_id, token_digest, request_id, payload_digest, email, shipping_address, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
      RETURNING id
    `,
    [
      cartId,
      `checkout-${suffix}`,
      randomUUID(),
      `payload-${suffix}`,
      "runtime-role@example.invalid",
      JSON.stringify({ postalCode: "400001" }),
      expiresAt,
    ],
  );
  const checkoutSessionId = checkout.rows[0]?.id;
  assert.ok(checkoutSessionId);

  const order = await ownerPool.query<IdRow>(
    `
      INSERT INTO public.commerce_orders (
        order_number, access_token_digest, checkout_session_id, guest_email,
        status, payment_state, subtotal_amount_minor, total_amount_minor,
        shipping_address_snapshot
      )
      VALUES ($1, $2, $3, $4, 'pending', 'unpaid', $5, $5, $6::jsonb)
      RETURNING id
    `,
    [
      `PA-RUNTIME-${suffix}`,
      `access-${suffix}`,
      checkoutSessionId,
      "runtime-role@example.invalid",
      orderAmountMinor,
      JSON.stringify({ postalCode: "400001" }),
    ],
  );
  const orderId = order.rows[0]?.id;
  assert.ok(orderId);

  await ownerPool.query(
    `
      INSERT INTO public.commerce_order_items (
        order_id, variant_id, product_name_snapshot, sku_snapshot, size_ml_snapshot,
        unit_price_amount_minor, quantity, line_total_amount_minor
      )
      VALUES ($1, $2, $3, $4, 50, 120000, 2, 240000)
    `,
    [orderId, variantId, `Restricted role test ${suffix}`, `ROLE-TEST-${suffix}`],
  );

  const providerOrderId = `cashfree-order-${suffix}`;
  const providerSessionId = `cashfree-session-${suffix}`;
  const paymentAttempt = await ownerPool.query<IdRow>(
    `
      INSERT INTO public.payment_attempts (
        order_id, provider, status, idempotency_key, amount_minor
      )
      VALUES ($1, 'cashfree', 'created', $2, $3)
      RETURNING id
    `,
    [orderId, `payment-attempt-${suffix}`, orderAmountMinor],
  );
  const paymentAttemptId = paymentAttempt.rows[0]?.id;
  assert.ok(paymentAttemptId);

  await ownerPool.query(
    `
      INSERT INTO public.locations (code, name)
      VALUES ('MAIN', 'Main')
      ON CONFLICT (code) DO NOTHING
    `,
  );
  const oilLot = await ownerPool.query<IdRow>(
    `
      INSERT INTO public.oil_lots (
        product_id, received_quantity_ml, remaining_quantity_ml, kg_bottles,
        total_cost_cents, received_date, note
      )
      VALUES ($1, 1000, 1000, 1, 500000, current_date, 'Restricted runtime role test')
      RETURNING id
    `,
    [productId],
  );
  const oilLotId = oilLot.rows[0]?.id;
  assert.ok(oilLotId);
  await ownerPool.query(
    `
      INSERT INTO public.oil_movements (
        lot_id, product_id, type, quantity_delta_ml, quantity_after_ml,
        note, idempotency_key
      )
      VALUES ($1, $2, 'receive', 1000, 1000, 'Restricted runtime role test receive', $3)
    `,
    [oilLotId, productId, `oil-receive-${suffix}`],
  );

  return {
    checkoutSessionId,
    orderId,
    paymentAttemptId,
    productId,
    providerOrderId,
    providerSessionId,
    variantId,
    oilLotId,
  };
}

async function buildForgedStorefrontCheckout(
  storefrontPool: Pool,
  catalog: SeededCheckout,
): Promise<SeededCheckout> {
  const suffix = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60_000);
  const forgedAmountMinor = 2;
  const snapshot = await storefrontPool.query<CatalogSnapshotRow>(
    `
      SELECT
        publication.public_name,
        product_variant.sku,
        product_variant.size_ml
      FROM public.product_variants AS product_variant
      INNER JOIN public.product_publications AS publication
        ON publication.product_id = product_variant.product_id
      WHERE product_variant.id = $1::uuid
    `,
    [catalog.variantId],
  );
  const catalogSnapshot = snapshot.rows[0];
  assert.ok(catalogSnapshot);

  const cart = await storefrontPool.query<IdRow>(
    `
      INSERT INTO public.commerce_carts (token_digest, expires_at)
      VALUES ($1, $2)
      RETURNING id
    `,
    [`forged-cart-${suffix}`, expiresAt],
  );
  const cartId = cart.rows[0]?.id;
  assert.ok(cartId);

  const checkout = await storefrontPool.query<IdRow>(
    `
      INSERT INTO public.checkout_sessions (
        cart_id, token_digest, request_id, payload_digest, email, shipping_address, expires_at
      )
      VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6::jsonb, $7)
      RETURNING id
    `,
    [
      cartId,
      `forged-checkout-${suffix}`,
      randomUUID(),
      `forged-payload-${suffix}`,
      "runtime-role@example.invalid",
      JSON.stringify({ postalCode: "400001" }),
      expiresAt,
    ],
  );
  const checkoutSessionId = checkout.rows[0]?.id;
  assert.ok(checkoutSessionId);

  const order = await storefrontPool.query<IdRow>(
    `
      INSERT INTO public.commerce_orders (
        order_number, access_token_digest, checkout_session_id, guest_email,
        subtotal_amount_minor, total_amount_minor, shipping_address_snapshot
      )
      VALUES ($1, $2, $3::uuid, $4, $5::integer, $5::integer, $6::jsonb)
      RETURNING id
    `,
    [
      `PA-FORGED-${suffix}`,
      `forged-access-${suffix}`,
      checkoutSessionId,
      "runtime-role@example.invalid",
      forgedAmountMinor,
      JSON.stringify({ postalCode: "400001" }),
    ],
  );
  const orderId = order.rows[0]?.id;
  assert.ok(orderId);

  await storefrontPool.query(
    `
      INSERT INTO public.commerce_order_items (
        order_id, variant_id, product_name_snapshot, sku_snapshot, size_ml_snapshot,
        unit_price_amount_minor, quantity, line_total_amount_minor
      )
      VALUES ($1::uuid, $2::uuid, $3, $4, $5::integer, 1, 2, $6::integer)
    `,
    [
      orderId,
      catalog.variantId,
      catalogSnapshot.public_name,
      catalogSnapshot.sku,
      catalogSnapshot.size_ml,
      forgedAmountMinor,
    ],
  );

  const paymentAttempt = await storefrontPool.query<IdRow>(
    `
      INSERT INTO public.payment_attempts (order_id, provider, idempotency_key, amount_minor)
      VALUES ($1::uuid, 'cashfree', $2, $3::integer)
      RETURNING id
    `,
    [orderId, `forged-payment-attempt-${suffix}`, forgedAmountMinor],
  );
  const paymentAttemptId = paymentAttempt.rows[0]?.id;
  assert.ok(paymentAttemptId);

  return {
    checkoutSessionId,
    orderId,
    paymentAttemptId,
    productId: catalog.productId,
    providerOrderId: `cashfree-forged-order-${suffix}`,
    providerSessionId: `cashfree-forged-session-${suffix}`,
    variantId: catalog.variantId,
    oilLotId: catalog.oilLotId,
  };
}

async function reserveAsStorefront(
  storefrontPool: Pool,
  seeded: SeededCheckout,
): Promise<void> {
  const reservation = await storefrontPool.query<
    QueryResultRow & { idempotent: boolean; quantity: number; variant_id: string }
  >(
    `
      SELECT reservation_id, variant_id, quantity, expires_at, idempotent
      FROM public.reserve_storefront_checkout_stock($1::uuid, ARRAY[$2::uuid], ARRAY[2], $3::timestamptz)
    `,
    [
      seeded.checkoutSessionId,
      seeded.variantId,
      new Date(Date.now() + 30 * 60_000),
    ],
  );
  assert.equal(reservation.rows.length, 1);
  const row = reservation.rows[0];
  assert.ok(row?.reservation_id);
  assert.equal(row.variant_id, seeded.variantId);
  assert.equal(row.quantity, 2);
  assert.equal(row.idempotent, false);
}

async function settledState(ownerPool: Pool, seeded: SeededCheckout): Promise<SettledStateRow> {
  const state = await ownerPool.query<SettledStateRow>(
    `
      SELECT
        checkout_session.status::text AS checkout_status,
        commerce_order.status::text AS order_status,
        commerce_order.payment_state::text AS payment_state,
        payment_attempt.status::text AS payment_attempt_status,
        payment_attempt.provider_payment_id,
        product_variant.quantity_on_hand,
        product_variant.qty_reserved,
        reservation.status::text AS reservation_status,
        oil_lot.remaining_quantity_ml,
        (
          SELECT count(*)::text
          FROM public.stock_movements AS stock_movement
          WHERE stock_movement.ref_id = commerce_order.id::text
            AND stock_movement.type = 'sale'
        ) AS stock_sale_count,
        (
          SELECT count(*)::text
          FROM public.oil_movements AS oil_movement
          WHERE oil_movement.ref_id = commerce_order.id::text
            AND oil_movement.type = 'sale'
        ) AS oil_sale_count
      FROM public.checkout_sessions AS checkout_session
      INNER JOIN public.commerce_orders AS commerce_order
        ON commerce_order.checkout_session_id = checkout_session.id
      INNER JOIN public.payment_attempts AS payment_attempt
        ON payment_attempt.id = $1::uuid
      INNER JOIN public.product_variants AS product_variant
        ON product_variant.id = $2::uuid
      INNER JOIN public.stock_reservations AS reservation
        ON reservation.checkout_session_id = checkout_session.id
          AND reservation.variant_id = product_variant.id
      INNER JOIN public.oil_lots AS oil_lot
        ON oil_lot.id = $3::uuid
      WHERE checkout_session.id = $4::uuid
        AND commerce_order.id = $5::uuid
    `,
    [
      seeded.paymentAttemptId,
      seeded.variantId,
      seeded.oilLotId,
      seeded.checkoutSessionId,
      seeded.orderId,
    ],
  );
  const row = state.rows[0];
  assert.ok(row);
  return row;
}

async function preBindingState(
  ownerPool: Pool,
  seeded: SeededCheckout,
): Promise<PreBindingStateRow> {
  const state = await ownerPool.query<PreBindingStateRow>(
    `
      SELECT
        checkout_session.status::text AS checkout_status,
        commerce_order.status::text AS order_status,
        commerce_order.payment_state::text AS payment_state,
        payment_attempt.status::text AS payment_attempt_status,
        payment_attempt.provider_order_id,
        payment_attempt.provider_session_id,
        product_variant.qty_reserved,
        oil_lot.remaining_quantity_ml,
        oil_lot.reserved_quantity_ml,
        (
          SELECT count(*)::integer
          FROM public.oil_reservations AS oil_reservation
          WHERE oil_reservation.checkout_session_id = checkout_session.id
        ) AS oil_reservation_count
      FROM public.checkout_sessions AS checkout_session
      INNER JOIN public.commerce_orders AS commerce_order
        ON commerce_order.checkout_session_id = checkout_session.id
      INNER JOIN public.payment_attempts AS payment_attempt
        ON payment_attempt.id = $1::uuid
          AND payment_attempt.order_id = commerce_order.id
      INNER JOIN public.product_variants AS product_variant
        ON product_variant.id = $2::uuid
      INNER JOIN public.oil_lots AS oil_lot
        ON oil_lot.id = $3::uuid
      WHERE checkout_session.id = $4::uuid
        AND commerce_order.id = $5::uuid
    `,
    [
      seeded.paymentAttemptId,
      seeded.variantId,
      seeded.oilLotId,
      seeded.checkoutSessionId,
      seeded.orderId,
    ],
  );
  const row = state.rows[0];
  assert.ok(row);
  return row;
}

async function oilReservationState(
  ownerPool: Pool,
  seeded: SeededCheckout,
): Promise<OilReservationStateRow> {
  const state = await ownerPool.query<OilReservationStateRow>(
    `
      SELECT
        oil_lot.remaining_quantity_ml,
        oil_lot.reserved_quantity_ml,
        oil_reservation.quantity_ml AS reservation_quantity_ml,
        oil_reservation.status::text AS reservation_status,
        (
          SELECT oil_movement.quantity_delta_ml
          FROM public.oil_movements AS oil_movement
          WHERE oil_movement.lot_id = oil_lot.id
            AND oil_movement.ref_type = 'commerce_order'
            AND oil_movement.ref_id = $1::uuid::text
            AND oil_movement.type = 'sale'
          ORDER BY oil_movement.created_at, oil_movement.id
          LIMIT 1
        ) AS oil_sale_quantity_delta_ml
      FROM public.oil_reservations AS oil_reservation
      INNER JOIN public.oil_lots AS oil_lot
        ON oil_lot.id = oil_reservation.lot_id
      WHERE oil_reservation.checkout_session_id = $2::uuid
        AND oil_reservation.lot_id = $3::uuid
    `,
    [seeded.orderId, seeded.checkoutSessionId, seeded.oilLotId],
  );
  const row = state.rows[0];
  assert.ok(row);
  return row;
}

describe("storefront and Cashfree finalizer runtime roles", () => {
  const ownerPool = new Pool({
    connectionString: testDatabaseUrl,
    max: 1,
    application_name: "perfume-aura-storefront-runtime-role-owner",
  });
  const storefrontRole = roleName("storefront_runtime_test");
  const finalizerRole = roleName("storefront_finalizer_test");
  const storefrontPassword = rolePassword();
  const finalizerPassword = rolePassword();
  let storefrontPool: Pool | undefined;
  let finalizerPool: Pool | undefined;

  before(async () => {
    const functions = await ownerPool.query<QueryResultRow & { routines_present: number }>(`
      SELECT count(*)::integer AS routines_present
      FROM pg_proc AS routine
      INNER JOIN pg_namespace AS namespace ON namespace.oid = routine.pronamespace
      WHERE namespace.nspname = 'public'
        AND routine.oid = ANY(ARRAY[
          to_regprocedure('public.reserve_storefront_checkout_stock(uuid,uuid[],integer[],timestamp with time zone)'),
          to_regprocedure('public.release_storefront_checkout_reservations(uuid,text,timestamp with time zone)'),
          to_regprocedure('public.settle_storefront_checkout_reservations(uuid,uuid,timestamp with time zone)'),
          to_regprocedure('public.bind_storefront_cashfree_payment_attempt(uuid,text,text,timestamp with time zone)'),
          to_regprocedure('public.finalize_storefront_cashfree_payment(uuid,uuid,text,integer,text,timestamp with time zone)'),
          to_regprocedure('public.cancel_storefront_cashfree_payment_attempt(uuid,text,timestamp with time zone)')
        ])
    `);
    assert.equal(functions.rows[0]?.routines_present, 6, "migration 0017 must be applied before role verification");

    const ownerCapability = await ownerPool.query<QueryResultRow & { can_create_role: boolean }>(`
      SELECT rolsuper OR rolcreaterole AS can_create_role
      FROM pg_roles
      WHERE rolname = current_user
    `);
    assert.equal(
      ownerCapability.rows[0]?.can_create_role,
      true,
      "the disposable integration database owner must be allowed to create isolated runtime roles",
    );

    // Model the deny-by-default base stage from runtime-roles.sql before the
    // source-controlled per-role grants are applied. In particular, an
    // explicit per-role revoke cannot override PostgreSQL's implicit PUBLIC
    // EXECUTE privilege on older application functions.
    await ownerPool.query(
      `REVOKE ALL PRIVILEGES ON DATABASE ${quoteIdentifier(databaseName(testDatabaseUrl))} FROM PUBLIC`,
    );
    await ownerPool.query("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
    await ownerPool.query("REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC");
    await ownerPool.query("REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC");
    await ownerPool.query("REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC");

    await ownerPool.query(
      `CREATE ROLE ${quoteIdentifier(storefrontRole)} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${storefrontPassword}'`,
    );
    await ownerPool.query(
      `CREATE ROLE ${quoteIdentifier(finalizerRole)} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${finalizerPassword}'`,
    );
    await ownerPool.query(
      `GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName(testDatabaseUrl))} TO ${quoteIdentifier(storefrontRole)}, ${quoteIdentifier(finalizerRole)}`,
    );
    await ownerPool.query(
      `GRANT USAGE ON SCHEMA public TO ${quoteIdentifier(storefrontRole)}, ${quoteIdentifier(finalizerRole)}`,
    );
    // The real role bootstrap owns this registry. The migration's transition
    // guards deliberately inspect session_user, so register these disposable
    // principals before exercising the same reviewed grant scripts.
    await ownerPool.query(
      `
        INSERT INTO public.runtime_capability_roles (role_name, capability)
        VALUES ($1, 'storefront'), ($2, 'payment_finalizer')
      `,
      [storefrontRole, finalizerRole],
    );

    await applyGrantScript(storefrontGrantsPath, storefrontRole);
    await applyGrantScript(paymentFinalizerGrantsPath, finalizerRole);

    storefrontPool = new Pool({
      connectionString: connectionUrlForRole(
        testDatabaseUrl,
        storefrontRole,
        storefrontPassword,
      ),
      max: 1,
      application_name: "perfume-aura-storefront-runtime-role",
    });
    finalizerPool = new Pool({
      connectionString: connectionUrlForRole(
        testDatabaseUrl,
        finalizerRole,
        finalizerPassword,
      ),
      max: 1,
      application_name: "perfume-aura-storefront-payment-finalizer-role",
    });
  });

  after(async () => {
    await storefrontPool?.end();
    await finalizerPool?.end();
    await ownerPool.query(
      "DELETE FROM public.runtime_capability_roles WHERE role_name = ANY($1::name[])",
      [[storefrontRole, finalizerRole]],
    );
    await dropRoleIfPresent(ownerPool, storefrontRole);
    await dropRoleIfPresent(ownerPool, finalizerRole);
    await ownerPool.end();
  });

  it("allows only reviewed reservation transitions to the storefront role", async () => {
    assert.ok(storefrontPool);
    const seeded = await seedCheckout(ownerPool);
    await reserveAsStorefront(storefrontPool, seeded);

    await expectPermissionDenied(() => storefrontPool.query(
      "SELECT cost_cents FROM public.product_variants WHERE id = $1::uuid",
      [seeded.variantId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "SELECT * FROM public.stock_movements LIMIT 1",
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "SELECT * FROM public.stock_reservations LIMIT 1",
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "SELECT * FROM public.oil_lots LIMIT 1",
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "SELECT * FROM public.oil_movements LIMIT 1",
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "SELECT * FROM public.oil_reservations LIMIT 1",
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "UPDATE public.product_variants SET quantity_on_hand = 0 WHERE id = $1::uuid",
      [seeded.variantId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "UPDATE public.oil_lots SET remaining_quantity_ml = 0 WHERE id = $1::uuid",
      [seeded.oilLotId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      `
        INSERT INTO public.stock_reservations (checkout_session_id, variant_id, quantity, expires_at)
        VALUES ($1::uuid, $2::uuid, 1, now() + interval '5 minutes')
      `,
      [seeded.checkoutSessionId, seeded.variantId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      `
        SELECT *
        FROM public.settle_storefront_checkout_reservations($1::uuid, $2::uuid, now())
      `,
      [seeded.checkoutSessionId, seeded.orderId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      `
        SELECT *
        FROM public.finalize_storefront_cashfree_payment(
          $1::uuid, $2::uuid, $3, $4::integer, 'forged-payment', now()
        )
      `,
      [seeded.paymentAttemptId, seeded.orderId, seeded.providerOrderId, orderAmountMinor],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      `
        SELECT order_id, checkout_session_id, idempotent
        FROM public.bind_storefront_cashfree_payment_attempt($1::uuid, $2, $3, now())
      `,
      [seeded.paymentAttemptId, seeded.providerOrderId, seeded.providerSessionId],
    ));

    const released = await storefrontPool.query<
      QueryResultRow & { released_count: number; idempotent: boolean; has_consumed: boolean }
    >(
      `
        SELECT released_count, idempotent, has_consumed
        FROM public.release_storefront_checkout_reservations($1::uuid, 'cancelled', now())
      `,
      [seeded.checkoutSessionId],
    );
    assert.deepEqual(released.rows, [{ released_count: 1, idempotent: false, has_consumed: false }]);
  });

  it("fails an oil-short initial reservation before provider binding", async () => {
    assert.ok(storefrontPool);
    assert.ok(finalizerPool);
    const seeded = await seedCheckout(ownerPool);
    await ownerPool.query(
      "UPDATE public.oil_lots SET remaining_quantity_ml = 49 WHERE id = $1::uuid",
      [seeded.oilLotId],
    );

    await assert.rejects(
      () => reserveAsStorefront(storefrontPool, seeded),
      isPostgresStateWithMessage("55000", /Insufficient oil for the checkout reservation/),
    );
    assert.deepEqual(await preBindingState(ownerPool, seeded), {
      checkout_status: "open",
      order_status: "pending",
      payment_state: "unpaid",
      payment_attempt_status: "created",
      provider_order_id: null,
      provider_session_id: null,
      qty_reserved: 0,
      remaining_quantity_ml: 49,
      reserved_quantity_ml: 0,
      oil_reservation_count: 0,
    });

    await assert.rejects(
      () => finalizerPool.query(
        `
          SELECT order_id, checkout_session_id, idempotent
          FROM public.bind_storefront_cashfree_payment_attempt($1::uuid, $2, $3, now())
        `,
        [seeded.paymentAttemptId, seeded.providerOrderId, seeded.providerSessionId],
      ),
      isPostgresState("P0001"),
    );
    assert.deepEqual(await preBindingState(ownerPool, seeded), {
      checkout_status: "open",
      order_status: "pending",
      payment_state: "unpaid",
      payment_attempt_status: "created",
      provider_order_id: null,
      provider_session_id: null,
      qty_reserved: 0,
      remaining_quantity_ml: 49,
      reserved_quantity_ml: 0,
      oil_reservation_count: 0,
    });
  });

  it("limits payment-pending cancellation to the finalizer and rejects later settlement", async () => {
    assert.ok(storefrontPool);
    assert.ok(finalizerPool);
    const seeded = await seedCheckout(ownerPool);
    await reserveAsStorefront(storefrontPool, seeded);

    const binding = await finalizerPool.query<BindingResultRow>(
      `
        SELECT order_id, checkout_session_id, idempotent
        FROM public.bind_storefront_cashfree_payment_attempt($1::uuid, $2, $3, now())
      `,
      [seeded.paymentAttemptId, seeded.providerOrderId, seeded.providerSessionId],
    );
    assert.deepEqual(binding.rows, [{
      order_id: seeded.orderId,
      checkout_session_id: seeded.checkoutSessionId,
      idempotent: false,
    }]);

    await assert.rejects(
      () => storefrontPool.query(
        `
          SELECT released_count, idempotent, has_consumed
          FROM public.release_storefront_checkout_reservations($1::uuid, 'payment_failed', now())
        `,
        [seeded.checkoutSessionId],
      ),
      isPostgresStateWithMessage(
        "42501",
        /Storefront runtime cannot release payment-pending reservations/,
      ),
    );
    await assert.rejects(
      () => storefrontPool.query(
        "UPDATE public.commerce_orders SET payment_state = 'failed' WHERE id = $1::uuid",
        [seeded.orderId],
      ),
      isPostgresStateWithMessage(
        "42501",
        /Storefront runtime cannot change unpaid or prepaid order payment state/,
      ),
    );
    await expectPermissionDenied(() => storefrontPool.query(
      "UPDATE public.checkout_sessions SET status = 'cancelled' WHERE id = $1::uuid",
      [seeded.checkoutSessionId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      `
        SELECT order_id, checkout_session_id, released_count, idempotent
        FROM public.cancel_storefront_cashfree_payment_attempt($1::uuid, 'payment_failed', now())
      `,
      [seeded.paymentAttemptId],
    ));

    assert.deepEqual(await settledState(ownerPool, seeded), {
      checkout_status: "payment_pending",
      order_status: "pending",
      payment_state: "prepaid_pending",
      payment_attempt_status: "pending",
      provider_payment_id: null,
      quantity_on_hand: 10,
      qty_reserved: 2,
      reservation_status: "active",
      remaining_quantity_ml: 1000,
      stock_sale_count: "0",
      oil_sale_count: "0",
    });

    const cancellation = await finalizerPool.query<CancellationResultRow>(
      `
        SELECT order_id, checkout_session_id, released_count, idempotent
        FROM public.cancel_storefront_cashfree_payment_attempt($1::uuid, 'payment_failed', now())
      `,
      [seeded.paymentAttemptId],
    );
    assert.deepEqual(cancellation.rows, [{
      order_id: seeded.orderId,
      checkout_session_id: seeded.checkoutSessionId,
      released_count: 1,
      idempotent: false,
    }]);
    assert.deepEqual(await settledState(ownerPool, seeded), {
      checkout_status: "cancelled",
      order_status: "cancelled",
      payment_state: "failed",
      payment_attempt_status: "failed",
      provider_payment_id: null,
      quantity_on_hand: 10,
      qty_reserved: 0,
      reservation_status: "released",
      remaining_quantity_ml: 1000,
      stock_sale_count: "0",
      oil_sale_count: "0",
    });
    assert.deepEqual(await oilReservationState(ownerPool, seeded), {
      remaining_quantity_ml: 1000,
      reserved_quantity_ml: 0,
      reservation_quantity_ml: 50,
      reservation_status: "released",
      oil_sale_quantity_delta_ml: null,
    });

    await assert.rejects(
      () => finalizerPool.query<FinalizerResultRow>(
        `
          SELECT newly_finalized, order_id
          FROM public.finalize_storefront_cashfree_payment($1::uuid, $2::uuid, $3, $4::integer, $5, now())
        `,
        [
          seeded.paymentAttemptId,
          seeded.orderId,
          seeded.providerOrderId,
          orderAmountMinor,
          `cashfree-after-cancel-${randomUUID()}`,
        ],
      ),
      isPostgresStateWithMessage("P0001", /Cashfree payment attempt is not eligible for finalization/),
    );
  });

  it("lets the finalizer atomically settle a verified Cashfree attempt without raw DML", async () => {
    assert.ok(storefrontPool);
    assert.ok(finalizerPool);
    const seeded = await seedCheckout(ownerPool);
    await reserveAsStorefront(storefrontPool, seeded);
    assert.deepEqual(await oilReservationState(ownerPool, seeded), {
      remaining_quantity_ml: 1000,
      reserved_quantity_ml: 50,
      reservation_quantity_ml: 50,
      reservation_status: "active",
      oil_sale_quantity_delta_ml: null,
    });

    await expectPermissionDenied(() => finalizerPool.query(
      "SELECT * FROM public.payment_attempts WHERE id = $1::uuid",
      [seeded.paymentAttemptId],
    ));
    await expectPermissionDenied(() => finalizerPool.query(
      "UPDATE public.payment_attempts SET status = 'succeeded' WHERE id = $1::uuid",
      [seeded.paymentAttemptId],
    ));
    await expectPermissionDenied(() => finalizerPool.query(
      `
        INSERT INTO public.stock_movements (
          variant_id, location_id, type, quantity_delta, quantity_after,
          note, unit_cost_cents, cost_basis
        )
        VALUES ($1::uuid, (SELECT id FROM public.locations WHERE code = 'MAIN'), 'sale', -1, 0, 'forged', 0, 'snapshot')
      `,
      [seeded.variantId],
    ));
    await expectPermissionDenied(() => finalizerPool.query(
      `
        SELECT *
        FROM public.settle_storefront_checkout_reservations($1::uuid, $2::uuid, now())
      `,
      [seeded.checkoutSessionId, seeded.orderId],
    ));

    await expectPermissionDenied(() => storefrontPool.query(
      "UPDATE public.payment_attempts SET order_id = $1::uuid WHERE id = $2::uuid",
      [seeded.orderId, seeded.paymentAttemptId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "UPDATE public.payment_attempts SET amount_minor = amount_minor + 1 WHERE id = $1::uuid",
      [seeded.paymentAttemptId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "UPDATE public.payment_attempts SET provider = 'cod' WHERE id = $1::uuid",
      [seeded.paymentAttemptId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "UPDATE public.payment_attempts SET provider_payment_id = 'forged' WHERE id = $1::uuid",
      [seeded.paymentAttemptId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "UPDATE public.payment_attempts SET provider_order_id = 'forged' WHERE id = $1::uuid",
      [seeded.paymentAttemptId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "UPDATE public.payment_attempts SET provider_session_id = 'forged' WHERE id = $1::uuid",
      [seeded.paymentAttemptId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      `
        INSERT INTO public.payment_attempts (
          order_id, provider, provider_order_id, provider_session_id, idempotency_key, amount_minor
        )
        VALUES ($1::uuid, 'cashfree', 'forged-order', 'forged-session', $2, $3::integer)
      `,
      [seeded.orderId, `forged-attempt-${randomUUID()}`, orderAmountMinor],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "UPDATE public.payment_attempts SET status = 'succeeded' WHERE id = $1::uuid",
      [seeded.paymentAttemptId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "UPDATE public.commerce_orders SET checkout_session_id = $1::uuid WHERE id = $2::uuid",
      [seeded.checkoutSessionId, seeded.orderId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "UPDATE public.commerce_orders SET total_amount_minor = total_amount_minor + 1 WHERE id = $1::uuid",
      [seeded.orderId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "UPDATE public.commerce_orders SET payment_state = 'paid' WHERE id = $1::uuid",
      [seeded.orderId],
    ));
    await expectPermissionDenied(() => storefrontPool.query(
      "UPDATE public.checkout_sessions SET status = 'completed' WHERE id = $1::uuid",
      [seeded.checkoutSessionId],
    ));

    await expectPermissionDenied(() => storefrontPool.query(
      `
        SELECT order_id, checkout_session_id, idempotent
        FROM public.bind_storefront_cashfree_payment_attempt($1::uuid, $2, $3, now())
      `,
      [seeded.paymentAttemptId, seeded.providerOrderId, seeded.providerSessionId],
    ));

    await assert.rejects(
      () => finalizerPool.query(
        `
          SELECT order_id, checkout_session_id, idempotent
          FROM public.bind_storefront_cashfree_payment_attempt($1::uuid, $2, ' ', now())
        `,
        [seeded.paymentAttemptId, seeded.providerOrderId],
      ),
      isPostgresState("22023"),
    );

    const expired = await seedCheckout(ownerPool);
    await reserveAsStorefront(storefrontPool, expired);
    await ownerPool.query(
      "UPDATE public.checkout_sessions SET expires_at = now() - interval '1 minute' WHERE id = $1::uuid",
      [expired.checkoutSessionId],
    );
    await assert.rejects(
      () => finalizerPool.query(
        `
          SELECT order_id, checkout_session_id, idempotent
          FROM public.bind_storefront_cashfree_payment_attempt($1::uuid, $2, $3, now())
        `,
        [expired.paymentAttemptId, expired.providerOrderId, expired.providerSessionId],
      ),
      isPostgresState("P0001"),
    );
    assert.deepEqual(await settledState(ownerPool, expired), {
      checkout_status: "open",
      order_status: "pending",
      payment_state: "unpaid",
      payment_attempt_status: "created",
      provider_payment_id: null,
      quantity_on_hand: 10,
      qty_reserved: 2,
      reservation_status: "active",
      remaining_quantity_ml: 1000,
      stock_sale_count: "0",
      oil_sale_count: "0",
    });

    // This shell is built entirely through the normal storefront role's
    // permitted column inserts, including a total that agrees with its forged
    // order line. Binding must nevertheless derive the approved catalog price
    // and reject it before any provider identity or inventory state changes.
    const forgedCatalog = await seedCheckout(ownerPool);
    const forged = await buildForgedStorefrontCheckout(storefrontPool, forgedCatalog);
    await reserveAsStorefront(storefrontPool, forged);
    await assert.rejects(
      () => finalizerPool.query(
        `
          SELECT order_id, checkout_session_id, idempotent
          FROM public.bind_storefront_cashfree_payment_attempt($1::uuid, $2, $3, now())
        `,
        [forged.paymentAttemptId, forged.providerOrderId, forged.providerSessionId],
      ),
      isPostgresStateWithMessage(
        "P0001",
        /Cashfree payment intent does not match approved catalog prices, shipping, stock, and oil reservations/,
      ),
    );
    assert.deepEqual(await settledState(ownerPool, forged), {
      checkout_status: "open",
      order_status: "pending",
      payment_state: "unpaid",
      payment_attempt_status: "created",
      provider_payment_id: null,
      quantity_on_hand: 10,
      qty_reserved: 2,
      reservation_status: "active",
      remaining_quantity_ml: 1000,
      stock_sale_count: "0",
      oil_sale_count: "0",
    });

    const binding = await finalizerPool.query<BindingResultRow>(
      `
        SELECT order_id, checkout_session_id, idempotent
        FROM public.bind_storefront_cashfree_payment_attempt($1::uuid, $2, $3, now())
      `,
      [seeded.paymentAttemptId, seeded.providerOrderId, seeded.providerSessionId],
    );
    assert.deepEqual(binding.rows, [{
      order_id: seeded.orderId,
      checkout_session_id: seeded.checkoutSessionId,
      idempotent: false,
    }]);
    const bindingReplay = await finalizerPool.query<BindingResultRow>(
      `
        SELECT order_id, checkout_session_id, idempotent
        FROM public.bind_storefront_cashfree_payment_attempt($1::uuid, $2, $3, now())
      `,
      [seeded.paymentAttemptId, seeded.providerOrderId, seeded.providerSessionId],
    );
    assert.deepEqual(bindingReplay.rows, [{
      order_id: seeded.orderId,
      checkout_session_id: seeded.checkoutSessionId,
      idempotent: true,
    }]);
    await assert.rejects(
      () => finalizerPool.query(
        `
          SELECT order_id, checkout_session_id, idempotent
          FROM public.bind_storefront_cashfree_payment_attempt($1::uuid, $2, $3, now())
        `,
        [
          seeded.paymentAttemptId,
          `other-provider-order-${randomUUID()}`,
          seeded.providerSessionId,
        ],
      ),
      isPostgresState("P0001"),
    );
    assert.deepEqual(await settledState(ownerPool, seeded), {
      checkout_status: "payment_pending",
      order_status: "pending",
      payment_state: "prepaid_pending",
      payment_attempt_status: "pending",
      provider_payment_id: null,
      quantity_on_hand: 10,
      qty_reserved: 2,
      reservation_status: "active",
      remaining_quantity_ml: 1000,
      stock_sale_count: "0",
      oil_sale_count: "0",
    });

    const paymentId = `cashfree-payment-${randomUUID()}`;
    const first = await finalizerPool.query<FinalizerResultRow>(
      `
        SELECT newly_finalized, order_id
        FROM public.finalize_storefront_cashfree_payment($1::uuid, $2::uuid, $3, $4::integer, $5, now())
      `,
      [
        seeded.paymentAttemptId,
        seeded.orderId,
        seeded.providerOrderId,
        orderAmountMinor,
        paymentId,
      ],
    );
    assert.deepEqual(first.rows, [{ newly_finalized: true, order_id: seeded.orderId }]);
    assert.deepEqual(await oilReservationState(ownerPool, seeded), {
      remaining_quantity_ml: 950,
      reserved_quantity_ml: 0,
      reservation_quantity_ml: 50,
      reservation_status: "consumed",
      oil_sale_quantity_delta_ml: -50,
    });

    assert.deepEqual(await settledState(ownerPool, seeded), {
      checkout_status: "completed",
      order_status: "confirmed",
      payment_state: "paid",
      payment_attempt_status: "succeeded",
      provider_payment_id: paymentId,
      quantity_on_hand: 8,
      qty_reserved: 0,
      reservation_status: "consumed",
      remaining_quantity_ml: 950,
      stock_sale_count: "1",
      oil_sale_count: "1",
    });

    const replay = await finalizerPool.query<FinalizerResultRow>(
      `
        SELECT newly_finalized, order_id
        FROM public.finalize_storefront_cashfree_payment($1::uuid, $2::uuid, $3, $4::integer, $5, now())
      `,
      [
        seeded.paymentAttemptId,
        seeded.orderId,
        seeded.providerOrderId,
        orderAmountMinor,
        paymentId,
      ],
    );
    assert.deepEqual(replay.rows, [{ newly_finalized: false, order_id: seeded.orderId }]);
    assert.deepEqual(await settledState(ownerPool, seeded), {
      checkout_status: "completed",
      order_status: "confirmed",
      payment_state: "paid",
      payment_attempt_status: "succeeded",
      provider_payment_id: paymentId,
      quantity_on_hand: 8,
      qty_reserved: 0,
      reservation_status: "consumed",
      remaining_quantity_ml: 950,
      stock_sale_count: "1",
      oil_sale_count: "1",
    });
  });
});
