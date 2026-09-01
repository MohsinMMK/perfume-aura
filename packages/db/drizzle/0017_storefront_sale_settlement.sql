-- Storefront runtime access is deliberately limited to these validated state
-- transitions. The caller never supplies a stock location, unit cost, oil lot,
-- or raw inventory balance: the routines derive and lock each of those values
-- under the migration owner inside one transaction.

-- This internal registry is maintained only by the reviewed role bootstrap.
-- Payment-state triggers use session_user (which a constrained runtime cannot
-- impersonate) instead of a hard-coded deployment role name, so operations,
-- finalizer, and customer-storefront identities remain distinct even when a
-- deployment chooses non-default role names.
CREATE TABLE public.runtime_capability_roles (
  role_name name PRIMARY KEY,
  capability text NOT NULL CHECK (capability IN ('ops', 'storefront', 'payment_finalizer')),
  registered_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- A checkout must reserve enough raw concentrate before the customer receives
-- a provider payment session. Finished-bottle availability alone is not enough:
-- without a raw-oil hold, a later Cashfree success could be real while the
-- order is impossible to fulfill. Reserve exact FIFO lot allocations so
-- release and settlement do not depend on a changing aggregate balance.
ALTER TABLE public.oil_lots
  ADD COLUMN reserved_quantity_ml integer NOT NULL DEFAULT 0,
  ADD CONSTRAINT oil_lots_reserved_quantity_check
    CHECK (
      reserved_quantity_ml >= 0
      AND reserved_quantity_ml <= remaining_quantity_ml
    );
--> statement-breakpoint

CREATE TABLE public.oil_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id uuid NOT NULL REFERENCES public.checkout_sessions(id) ON DELETE RESTRICT,
  lot_id uuid NOT NULL REFERENCES public.oil_lots(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity_ml integer NOT NULL CHECK (quantity_ml > 0),
  status public.stock_reservation_status NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  released_at timestamptz,
  release_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (checkout_session_id, lot_id)
);
--> statement-breakpoint

CREATE INDEX oil_reservations_checkout_status_idx
  ON public.oil_reservations (checkout_session_id, status, lot_id);
--> statement-breakpoint

CREATE INDEX oil_reservations_status_expires_idx
  ON public.oil_reservations (status, expires_at);
--> statement-breakpoint

CREATE FUNCTION public.reserve_storefront_checkout_stock(
  p_checkout_session_id uuid,
  p_variant_ids uuid[],
  p_quantities integer[],
  p_expires_at timestamptz
)
RETURNS TABLE(
  reservation_id uuid,
  variant_id uuid,
  quantity integer,
  expires_at timestamptz,
  idempotent boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_checkout_status public.checkout_status;
  v_checkout_expires_at timestamptz;
  v_reservation record;
  v_product record;
  v_variant record;
  v_oil_demand record;
  v_oil_lot record;
  v_reservation_count integer := 0;
  v_active_reservation_count integer := 0;
  v_matching_reservation_count integer := 0;
  v_oil_reservation_count integer := 0;
  v_active_oil_reservation_count integer := 0;
  v_oil_reservation_mismatch_count integer := 0;
  v_variant_count integer := 0;
  v_expected_count integer;
  v_available_oil_ml integer;
  v_remaining_oil_need_ml integer;
  v_take_oil_ml integer;
  v_sellable boolean;
BEGIN
  IF p_checkout_session_id IS NULL
    OR p_variant_ids IS NULL
    OR p_quantities IS NULL
    OR p_expires_at IS NULL
    OR array_ndims(p_variant_ids) <> 1
    OR array_ndims(p_quantities) <> 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Storefront reservation requires one-dimensional checkout items and an expiry';
  END IF;

  v_expected_count := cardinality(p_variant_ids);
  IF v_expected_count = 0
    OR cardinality(p_quantities) <> v_expected_count
    OR array_position(p_variant_ids, NULL) IS NOT NULL
    OR array_position(p_quantities, NULL) IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM unnest(p_variant_ids, p_quantities) AS requested(variant_id, quantity)
      WHERE requested.quantity <= 0
    )
    OR EXISTS (
      SELECT 1
      FROM unnest(p_variant_ids) AS requested(variant_id)
      GROUP BY requested.variant_id
      HAVING count(*) > 1
    ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Storefront reservation items must be unique positive variant quantities';
  END IF;

  SELECT checkout_session.status, checkout_session.expires_at
  INTO v_checkout_status, v_checkout_expires_at
  FROM public.checkout_sessions AS checkout_session
  WHERE checkout_session.id = p_checkout_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Checkout session was not found';
  END IF;

  FOR v_reservation IN
    SELECT reservation.id, reservation.variant_id, reservation.quantity,
           reservation.status, reservation.expires_at
    FROM public.stock_reservations AS reservation
    WHERE reservation.checkout_session_id = p_checkout_session_id
    ORDER BY reservation.variant_id
    FOR UPDATE
  LOOP
    v_reservation_count := v_reservation_count + 1;
    IF v_reservation.status = 'active' THEN
      v_active_reservation_count := v_active_reservation_count + 1;
    END IF;
  END LOOP;

  IF v_reservation_count > 0 THEN
    SELECT count(*)
    INTO v_matching_reservation_count
    FROM public.stock_reservations AS reservation
    INNER JOIN unnest(p_variant_ids, p_quantities) AS requested(variant_id, quantity)
      ON requested.variant_id = reservation.variant_id
      AND requested.quantity = reservation.quantity
    WHERE reservation.checkout_session_id = p_checkout_session_id
      AND reservation.status = 'active';

    IF v_active_reservation_count <> v_reservation_count
      OR v_matching_reservation_count <> v_expected_count
      OR v_reservation_count <> v_expected_count THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Checkout already owns a different reservation set';
    END IF;

    SELECT count(*)::integer,
           count(*) FILTER (WHERE oil_reservation.status = 'active')::integer
    INTO v_oil_reservation_count, v_active_oil_reservation_count
    FROM public.oil_reservations AS oil_reservation
    WHERE oil_reservation.checkout_session_id = p_checkout_session_id;

    WITH expected AS (
      SELECT product_variant.product_id,
             sum((product_variant.size_ml * requested.quantity + 1) / 2)::integer AS quantity_ml
      FROM public.product_variants AS product_variant
      INNER JOIN unnest(p_variant_ids, p_quantities) AS requested(variant_id, quantity)
        ON requested.variant_id = product_variant.id
      GROUP BY product_variant.product_id
    ), actual AS (
      SELECT oil_reservation.product_id,
             sum(oil_reservation.quantity_ml)::integer AS quantity_ml
      FROM public.oil_reservations AS oil_reservation
      WHERE oil_reservation.checkout_session_id = p_checkout_session_id
        AND oil_reservation.status = 'active'
      GROUP BY oil_reservation.product_id
    )
    SELECT count(*)::integer
    INTO v_oil_reservation_mismatch_count
    FROM (
      (SELECT expected.product_id, expected.quantity_ml FROM expected
       EXCEPT
       SELECT actual.product_id, actual.quantity_ml FROM actual)
      UNION ALL
      (SELECT actual.product_id, actual.quantity_ml FROM actual
       EXCEPT
       SELECT expected.product_id, expected.quantity_ml FROM expected)
    ) AS mismatch;

    IF v_oil_reservation_count = 0
      OR v_active_oil_reservation_count <> v_oil_reservation_count
      OR v_oil_reservation_mismatch_count <> 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Checkout already owns a different oil reservation set';
    END IF;

    RETURN QUERY
    SELECT reservation.id, reservation.variant_id, reservation.quantity,
           reservation.expires_at, true
    FROM public.stock_reservations AS reservation
    WHERE reservation.checkout_session_id = p_checkout_session_id
    ORDER BY reservation.variant_id;
    RETURN;
  END IF;

  IF v_checkout_status <> 'open'
    OR v_checkout_expires_at <= clock_timestamp()
    OR p_expires_at <= clock_timestamp()
    OR p_expires_at > v_checkout_expires_at THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Checkout must be open and unexpired before stock can be reserved';
  END IF;

  -- Every inventory path locks products before variants, in stable UUID order.
  FOR v_product IN
    SELECT product.id, product.status
    FROM public.products AS product
    INNER JOIN (
      SELECT DISTINCT product_variant.product_id
      FROM public.product_variants AS product_variant
      WHERE product_variant.id = ANY(p_variant_ids)
    ) AS candidate ON candidate.product_id = product.id
    ORDER BY product.id
    FOR UPDATE OF product
  LOOP
    IF v_product.status <> 'active' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'All reserved products must be active';
    END IF;
  END LOOP;

  FOR v_variant IN
    SELECT product_variant.id, product_variant.product_id,
           product_variant.status, product_variant.quantity_on_hand,
           product_variant.qty_reserved, requested.quantity
    FROM public.product_variants AS product_variant
    INNER JOIN unnest(p_variant_ids, p_quantities) AS requested(variant_id, quantity)
      ON requested.variant_id = product_variant.id
    ORDER BY product_variant.id
    FOR UPDATE OF product_variant
  LOOP
    v_variant_count := v_variant_count + 1;

    SELECT EXISTS (
      SELECT 1
      FROM public.product_publications AS publication
      INNER JOIN public.variant_prices AS price
        ON price.variant_id = v_variant.id
      WHERE publication.product_id = v_variant.product_id
        AND publication.status = 'published'
        AND publication.legal_approved_at IS NOT NULL
        AND publication.legal_approval_reference IS NOT NULL
        AND publication.content_approved_at IS NOT NULL
        AND publication.content_approval_reference IS NOT NULL
        AND publication.media_approved_at IS NOT NULL
        AND publication.media_approval_reference IS NOT NULL
        AND price.active
        AND price.approved_at IS NOT NULL
        AND price.approval_reference IS NOT NULL
        AND price.currency = 'INR'
        AND price.amount_minor > 0
    )
    INTO v_sellable;

    IF v_variant.status <> 'active' OR NOT v_sellable THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Every reserved variant must be active, published, and price-approved';
    END IF;

    IF v_variant.quantity > v_variant.quantity_on_hand - v_variant.qty_reserved THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P1001',
        MESSAGE = 'Insufficient available stock for a reserved variant';
    END IF;
  END LOOP;

  IF v_variant_count <> v_expected_count THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'One or more product variants were not found';
  END IF;

  -- Reserve exact FIFO concentrate allocations before any provider payment
  -- session exists. Every owner-side oil consumer subtracts this held quantity
  -- from availability, so a later verified payment cannot be valid but
  -- unfulfillable for lack of raw oil.
  FOR v_oil_demand IN
    SELECT product_variant.product_id,
           sum((product_variant.size_ml * requested.quantity + 1) / 2)::integer AS required_ml
    FROM public.product_variants AS product_variant
    INNER JOIN unnest(p_variant_ids, p_quantities) AS requested(variant_id, quantity)
      ON requested.variant_id = product_variant.id
    GROUP BY product_variant.product_id
    ORDER BY product_variant.product_id
  LOOP
    v_available_oil_ml := 0;
    FOR v_oil_lot IN
      SELECT oil_lot.id,
             oil_lot.product_id,
             oil_lot.remaining_quantity_ml,
             oil_lot.reserved_quantity_ml,
             oil_lot.created_at
      FROM public.oil_lots AS oil_lot
      WHERE oil_lot.product_id = v_oil_demand.product_id
        AND oil_lot.remaining_quantity_ml > oil_lot.reserved_quantity_ml
      ORDER BY oil_lot.created_at, oil_lot.id
      FOR UPDATE
    LOOP
      v_available_oil_ml := v_available_oil_ml
        + v_oil_lot.remaining_quantity_ml
        - v_oil_lot.reserved_quantity_ml;
    END LOOP;

    IF v_available_oil_ml < v_oil_demand.required_ml THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P1002',
        MESSAGE = 'Insufficient oil for the checkout reservation';
    END IF;

    v_remaining_oil_need_ml := v_oil_demand.required_ml;
    FOR v_oil_lot IN
      SELECT oil_lot.id,
             oil_lot.product_id,
             oil_lot.remaining_quantity_ml,
             oil_lot.reserved_quantity_ml,
             oil_lot.created_at
      FROM public.oil_lots AS oil_lot
      WHERE oil_lot.product_id = v_oil_demand.product_id
        AND oil_lot.remaining_quantity_ml > oil_lot.reserved_quantity_ml
      ORDER BY oil_lot.created_at, oil_lot.id
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining_oil_need_ml = 0;
      v_take_oil_ml := LEAST(
        v_oil_lot.remaining_quantity_ml - v_oil_lot.reserved_quantity_ml,
        v_remaining_oil_need_ml
      );

      UPDATE public.oil_lots AS oil_lot
      SET
        reserved_quantity_ml = oil_lot.reserved_quantity_ml + v_take_oil_ml,
        version = oil_lot.version + 1,
        updated_at = clock_timestamp()
      WHERE oil_lot.id = v_oil_lot.id
        AND oil_lot.remaining_quantity_ml - oil_lot.reserved_quantity_ml >= v_take_oil_ml;
      IF NOT FOUND THEN
        RAISE EXCEPTION USING
          ERRCODE = '40001',
          MESSAGE = 'Concurrent oil reservation update';
      END IF;

      INSERT INTO public.oil_reservations (
        checkout_session_id,
        lot_id,
        product_id,
        quantity_ml,
        expires_at
      )
      VALUES (
        p_checkout_session_id,
        v_oil_lot.id,
        v_oil_demand.product_id,
        v_take_oil_ml,
        p_expires_at
      );

      v_remaining_oil_need_ml := v_remaining_oil_need_ml - v_take_oil_ml;
    END LOOP;
  END LOOP;

  UPDATE public.product_variants AS product_variant
  SET
    qty_reserved = product_variant.qty_reserved + requested.quantity,
    version = product_variant.version + 1,
    updated_at = clock_timestamp()
  FROM unnest(p_variant_ids, p_quantities) AS requested(variant_id, quantity)
  WHERE product_variant.id = requested.variant_id;

  RETURN QUERY
  INSERT INTO public.stock_reservations AS inserted_reservation (
    checkout_session_id,
    variant_id,
    quantity,
    expires_at
  )
  SELECT p_checkout_session_id, requested.variant_id, requested.quantity, p_expires_at
  FROM unnest(p_variant_ids, p_quantities) AS requested(variant_id, quantity)
  ORDER BY requested.variant_id
  RETURNING inserted_reservation.id,
            inserted_reservation.variant_id,
            inserted_reservation.quantity,
            inserted_reservation.expires_at,
            false;
END;
$$;
--> statement-breakpoint

CREATE FUNCTION public.release_storefront_checkout_reservations(
  p_checkout_session_id uuid,
  p_reason text,
  p_released_at timestamptz
)
RETURNS TABLE(
  released_count integer,
  idempotent boolean,
  has_consumed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_checkout record;
  v_capability text;
  v_reservation record;
  v_product record;
  v_variant record;
  v_oil_reservation record;
  v_reservation_count integer := 0;
  v_active_count integer := 0;
  v_consumed_count integer := 0;
  v_oil_reservation_count integer := 0;
  v_active_oil_count integer := 0;
  v_consumed_oil_count integer := 0;
BEGIN
  IF p_checkout_session_id IS NULL
    OR p_released_at IS NULL
    OR p_reason IS NULL
    OR p_reason NOT IN ('cancelled', 'payment_failed', 'abandoned', 'expired') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Storefront reservation release requires a valid reason and timestamp';
  END IF;

  SELECT checkout_session.id, checkout_session.status
  INTO v_checkout
  FROM public.checkout_sessions AS checkout_session
  WHERE checkout_session.id = p_checkout_session_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Checkout session was not found';
  END IF;

  -- The regular storefront principal may release a still-open local intent,
  -- but only the separately credentialed finalizer can cancel a provider-bound
  -- payment_pending checkout. That prevents a stale error path from releasing
  -- inventory while a valid Cashfree payment is being finalized.
  IF v_checkout.status = 'payment_pending' THEN
    SELECT capability
    INTO v_capability
    FROM public.runtime_capability_roles
    WHERE role_name = session_user;

    IF v_capability = 'storefront' THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Storefront runtime cannot release payment-pending reservations';
    END IF;
  END IF;

  FOR v_reservation IN
    SELECT reservation.id, reservation.variant_id, reservation.quantity, reservation.status
    FROM public.stock_reservations AS reservation
    WHERE reservation.checkout_session_id = p_checkout_session_id
    ORDER BY reservation.variant_id
    FOR UPDATE
  LOOP
    v_reservation_count := v_reservation_count + 1;
    IF v_reservation.status = 'active' THEN
      v_active_count := v_active_count + 1;
    ELSIF v_reservation.status = 'consumed' THEN
      v_consumed_count := v_consumed_count + 1;
    END IF;
  END LOOP;

  FOR v_oil_reservation IN
    SELECT oil_reservation.id, oil_reservation.status
    FROM public.oil_reservations AS oil_reservation
    WHERE oil_reservation.checkout_session_id = p_checkout_session_id
    ORDER BY oil_reservation.product_id, oil_reservation.lot_id
    FOR UPDATE
  LOOP
    v_oil_reservation_count := v_oil_reservation_count + 1;
    IF v_oil_reservation.status = 'active' THEN
      v_active_oil_count := v_active_oil_count + 1;
    ELSIF v_oil_reservation.status = 'consumed' THEN
      v_consumed_oil_count := v_consumed_oil_count + 1;
    END IF;
  END LOOP;

  IF v_active_count = 0 THEN
    IF v_active_oil_count <> 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Checkout oil reservations are inconsistent with stock reservations';
    END IF;
    RETURN QUERY SELECT 0, true, v_consumed_count > 0 OR v_consumed_oil_count > 0;
    RETURN;
  END IF;

  IF v_active_count <> v_reservation_count THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Checkout reservations are not wholly active';
  END IF;

  -- Pre-0017 checkouts have no oil holds and may be safely released, but no
  -- checkout with a partial/mixed oil reservation set may mutate stock.
  IF v_oil_reservation_count > 0
    AND v_active_oil_count <> v_oil_reservation_count THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Checkout oil reservations are not wholly active';
  END IF;

  FOR v_product IN
    SELECT product.id
    FROM public.products AS product
    INNER JOIN (
      SELECT DISTINCT product_variant.product_id
      FROM public.product_variants AS product_variant
      INNER JOIN public.stock_reservations AS reservation
        ON reservation.variant_id = product_variant.id
      WHERE reservation.checkout_session_id = p_checkout_session_id
        AND reservation.status = 'active'
    ) AS candidate ON candidate.product_id = product.id
    ORDER BY product.id
    FOR UPDATE OF product
  LOOP
    NULL;
  END LOOP;

  FOR v_variant IN
    SELECT product_variant.id, product_variant.qty_reserved, reservation.quantity
    FROM public.stock_reservations AS reservation
    INNER JOIN public.product_variants AS product_variant
      ON product_variant.id = reservation.variant_id
    WHERE reservation.checkout_session_id = p_checkout_session_id
      AND reservation.status = 'active'
    ORDER BY product_variant.id
    FOR UPDATE OF product_variant
  LOOP
    IF v_variant.qty_reserved < v_variant.quantity THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Reserved inventory balance is inconsistent';
    END IF;

    UPDATE public.product_variants AS product_variant
    SET
      qty_reserved = product_variant.qty_reserved - v_variant.quantity,
      version = product_variant.version + 1,
      updated_at = p_released_at
    WHERE product_variant.id = v_variant.id
      AND product_variant.qty_reserved >= v_variant.quantity;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Reserved inventory balance is inconsistent';
    END IF;
  END LOOP;

  UPDATE public.stock_reservations AS reservation
  SET
    status = CASE WHEN p_reason = 'expired' THEN 'expired'::public.stock_reservation_status
                  ELSE 'released'::public.stock_reservation_status END,
    released_at = p_released_at,
    release_reason = p_reason
  WHERE reservation.checkout_session_id = p_checkout_session_id
    AND reservation.status = 'active';

  FOR v_oil_reservation IN
    SELECT oil_reservation.id,
           oil_reservation.lot_id,
           oil_reservation.quantity_ml,
           oil_lot.reserved_quantity_ml,
           oil_lot.remaining_quantity_ml
    FROM public.oil_reservations AS oil_reservation
    INNER JOIN public.oil_lots AS oil_lot
      ON oil_lot.id = oil_reservation.lot_id
    WHERE oil_reservation.checkout_session_id = p_checkout_session_id
      AND oil_reservation.status = 'active'
    ORDER BY oil_reservation.product_id, oil_lot.created_at, oil_lot.id
    FOR UPDATE OF oil_reservation, oil_lot
  LOOP
    IF v_oil_reservation.reserved_quantity_ml < v_oil_reservation.quantity_ml
      OR v_oil_reservation.remaining_quantity_ml < v_oil_reservation.quantity_ml THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Reserved oil balance is inconsistent';
    END IF;

    UPDATE public.oil_lots AS oil_lot
    SET
      reserved_quantity_ml = oil_lot.reserved_quantity_ml - v_oil_reservation.quantity_ml,
      version = oil_lot.version + 1,
      updated_at = p_released_at
    WHERE oil_lot.id = v_oil_reservation.lot_id
      AND oil_lot.reserved_quantity_ml >= v_oil_reservation.quantity_ml;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Reserved oil balance is inconsistent';
    END IF;
  END LOOP;

  UPDATE public.oil_reservations AS oil_reservation
  SET
    status = CASE WHEN p_reason = 'expired' THEN 'expired'::public.stock_reservation_status
                  ELSE 'released'::public.stock_reservation_status END,
    released_at = p_released_at,
    release_reason = p_reason
  WHERE oil_reservation.checkout_session_id = p_checkout_session_id
    AND oil_reservation.status = 'active';

  RETURN QUERY SELECT v_active_count, false, false;
END;
$$;
--> statement-breakpoint

CREATE FUNCTION public.settle_storefront_checkout_reservations(
  p_checkout_session_id uuid,
  p_order_id uuid,
  p_settled_at timestamptz
)
RETURNS TABLE(
  consumed_count integer,
  idempotent boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_order record;
  v_reservation record;
  v_product record;
  v_variant record;
  v_oil_reservation record;
  v_location_id uuid;
  v_reservation_count integer := 0;
  v_active_count integer := 0;
  v_consumed_count integer := 0;
  v_oil_reservation_count integer := 0;
  v_active_oil_count integer := 0;
  v_consumed_oil_count integer := 0;
  v_oil_reservation_mismatch_count integer := 0;
  v_order_quantity integer;
  v_idempotency_key text;
  v_after_ml integer;
BEGIN
  IF p_checkout_session_id IS NULL OR p_order_id IS NULL OR p_settled_at IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Storefront sale settlement requires a checkout, order, and timestamp';
  END IF;

  PERFORM 1
  FROM public.checkout_sessions AS checkout_session
  WHERE checkout_session.id = p_checkout_session_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Checkout session was not found';
  END IF;

  SELECT commerce_order.checkout_session_id,
         commerce_order.status,
         commerce_order.payment_state
  INTO v_order
  FROM public.commerce_orders AS commerce_order
  WHERE commerce_order.id = p_order_id
  FOR UPDATE;
  IF NOT FOUND OR v_order.checkout_session_id <> p_checkout_session_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Order does not belong to the checkout reservation';
  END IF;

  IF v_order.status IN ('cancelled', 'returned')
    OR v_order.payment_state NOT IN ('prepaid_pending', 'paid', 'cod_collected') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Order is not eligible for inventory settlement';
  END IF;

  FOR v_reservation IN
    SELECT reservation.id, reservation.variant_id, reservation.quantity, reservation.status
    FROM public.stock_reservations AS reservation
    WHERE reservation.checkout_session_id = p_checkout_session_id
    ORDER BY reservation.variant_id
    FOR UPDATE
  LOOP
    v_reservation_count := v_reservation_count + 1;
    IF v_reservation.status = 'active' THEN
      v_active_count := v_active_count + 1;
    ELSIF v_reservation.status = 'consumed' THEN
      v_consumed_count := v_consumed_count + 1;
    END IF;
  END LOOP;

  SELECT count(*)::integer,
         count(*) FILTER (WHERE oil_reservation.status = 'active')::integer,
         count(*) FILTER (WHERE oil_reservation.status = 'consumed')::integer
  INTO v_oil_reservation_count, v_active_oil_count, v_consumed_oil_count
  FROM public.oil_reservations AS oil_reservation
  WHERE oil_reservation.checkout_session_id = p_checkout_session_id;

  IF v_reservation_count = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Checkout reservation was not found';
  END IF;

  IF v_consumed_count = v_reservation_count THEN
    IF v_active_oil_count <> 0
      OR (
        v_oil_reservation_count > 0
        AND v_consumed_oil_count <> v_oil_reservation_count
      ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Consumed stock reservations have an inconsistent oil settlement';
    END IF;
    RETURN QUERY SELECT 0, true;
    RETURN;
  END IF;

  IF v_active_count <> v_reservation_count THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Checkout reservations are not wholly active';
  END IF;

  FOR v_reservation IN
    SELECT reservation.variant_id, reservation.quantity
    FROM public.stock_reservations AS reservation
    WHERE reservation.checkout_session_id = p_checkout_session_id
      AND reservation.status = 'active'
    ORDER BY reservation.variant_id
  LOOP
    SELECT COALESCE(sum(order_item.quantity), 0)
    INTO v_order_quantity
    FROM public.commerce_order_items AS order_item
    WHERE order_item.order_id = p_order_id
      AND order_item.variant_id = v_reservation.variant_id;
    IF v_order_quantity <> v_reservation.quantity THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Order items do not exactly match the checkout reservation';
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM public.commerce_order_items AS order_item
    WHERE order_item.order_id = p_order_id
      AND (
        order_item.variant_id IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM public.stock_reservations AS reservation
          WHERE reservation.checkout_session_id = p_checkout_session_id
            AND reservation.status = 'active'
            AND reservation.variant_id = order_item.variant_id
        )
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Order items do not exactly match the checkout reservation';
  END IF;

  -- Settlement must consume the exact raw-oil holds made before the provider
  -- session was issued. Never recalculate from whichever lots happen to be
  -- available now: that would let a later sale steal a paid checkout's oil.
  WITH expected AS (
    SELECT product_variant.product_id,
           sum((product_variant.size_ml * reservation.quantity + 1) / 2)::integer AS quantity_ml
    FROM public.stock_reservations AS reservation
    INNER JOIN public.product_variants AS product_variant
      ON product_variant.id = reservation.variant_id
    WHERE reservation.checkout_session_id = p_checkout_session_id
      AND reservation.status = 'active'
    GROUP BY product_variant.product_id
  ), actual AS (
    SELECT oil_reservation.product_id,
           sum(oil_reservation.quantity_ml)::integer AS quantity_ml
    FROM public.oil_reservations AS oil_reservation
    WHERE oil_reservation.checkout_session_id = p_checkout_session_id
      AND oil_reservation.status = 'active'
    GROUP BY oil_reservation.product_id
  )
  SELECT count(*)::integer
  INTO v_oil_reservation_mismatch_count
  FROM (
    (SELECT expected.product_id, expected.quantity_ml FROM expected
     EXCEPT
     SELECT actual.product_id, actual.quantity_ml FROM actual)
    UNION ALL
    (SELECT actual.product_id, actual.quantity_ml FROM actual
     EXCEPT
     SELECT expected.product_id, expected.quantity_ml FROM expected)
  ) AS mismatch;

  IF v_oil_reservation_count = 0
    OR v_active_oil_count <> v_oil_reservation_count
    OR v_oil_reservation_mismatch_count <> 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Checkout does not own the exact active oil reservation set';
  END IF;

  SELECT location.id
  INTO v_location_id
  FROM public.locations AS location
  WHERE location.code = 'MAIN'
  FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Inventory location MAIN is not configured';
  END IF;

  -- Maintain the same product-then-variant lock order as reservation release.
  FOR v_product IN
    SELECT product.id
    FROM public.products AS product
    INNER JOIN (
      SELECT DISTINCT product_variant.product_id
      FROM public.product_variants AS product_variant
      INNER JOIN public.stock_reservations AS reservation
        ON reservation.variant_id = product_variant.id
      WHERE reservation.checkout_session_id = p_checkout_session_id
        AND reservation.status = 'active'
    ) AS candidate ON candidate.product_id = product.id
    ORDER BY product.id
    FOR UPDATE OF product
  LOOP
    NULL;
  END LOOP;

  PERFORM 1
  FROM public.oil_movements AS oil_movement
  WHERE oil_movement.ref_type = 'commerce_order'
    AND oil_movement.ref_id = p_order_id::text
    AND oil_movement.type = 'sale';
  IF FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Active checkout reservations already have oil settlement movements';
  END IF;

  FOR v_variant IN
    SELECT product_variant.id, product_variant.product_id, product_variant.size_ml,
           product_variant.cost_cents, product_variant.quantity_on_hand,
           product_variant.qty_reserved, reservation.quantity
    FROM public.stock_reservations AS reservation
    INNER JOIN public.product_variants AS product_variant
      ON product_variant.id = reservation.variant_id
    WHERE reservation.checkout_session_id = p_checkout_session_id
      AND reservation.status = 'active'
    ORDER BY product_variant.id
    FOR UPDATE OF product_variant
  LOOP
    IF v_variant.quantity_on_hand < v_variant.quantity
      OR v_variant.qty_reserved < v_variant.quantity THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Reserved inventory balance is inconsistent';
    END IF;

    v_idempotency_key := 'commerce-order:' || p_order_id::text || ':' || v_variant.id::text;
    PERFORM 1
    FROM public.stock_movements AS stock_movement
    WHERE stock_movement.idempotency_key = v_idempotency_key;
    IF FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Active checkout reservations already have stock settlement movements';
    END IF;

    INSERT INTO public.stock_movements (
      variant_id,
      location_id,
      type,
      quantity_delta,
      quantity_after,
      ref_type,
      ref_id,
      note,
      idempotency_key,
      unit_cost_cents,
      cost_basis
    )
    VALUES (
      v_variant.id,
      v_location_id,
      'sale',
      -v_variant.quantity,
      v_variant.quantity_on_hand - v_variant.quantity,
      'commerce_order',
      p_order_id::text,
      'Storefront order inventory settlement',
      v_idempotency_key,
      v_variant.cost_cents,
      'snapshot'
    );

    UPDATE public.product_variants AS product_variant
    SET
      quantity_on_hand = product_variant.quantity_on_hand - v_variant.quantity,
      qty_reserved = product_variant.qty_reserved - v_variant.quantity,
      version = product_variant.version + 1,
      updated_at = p_settled_at
    WHERE product_variant.id = v_variant.id
      AND product_variant.quantity_on_hand >= v_variant.quantity
      AND product_variant.qty_reserved >= v_variant.quantity;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Reserved inventory balance is inconsistent';
    END IF;
  END LOOP;

  FOR v_oil_reservation IN
    SELECT oil_reservation.id,
           oil_reservation.lot_id,
           oil_reservation.product_id,
           oil_reservation.quantity_ml,
           oil_lot.remaining_quantity_ml,
           oil_lot.reserved_quantity_ml
    FROM public.oil_reservations AS oil_reservation
    INNER JOIN public.oil_lots AS oil_lot
      ON oil_lot.id = oil_reservation.lot_id
    WHERE oil_reservation.checkout_session_id = p_checkout_session_id
      AND oil_reservation.status = 'active'
    ORDER BY oil_reservation.product_id, oil_lot.created_at, oil_lot.id
    FOR UPDATE OF oil_reservation, oil_lot
  LOOP
    IF v_oil_reservation.remaining_quantity_ml < v_oil_reservation.quantity_ml
      OR v_oil_reservation.reserved_quantity_ml < v_oil_reservation.quantity_ml THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Reserved oil balance is inconsistent';
    END IF;

    v_idempotency_key := 'oil:commerce-order:' || p_order_id::text || ':' || v_oil_reservation.lot_id::text;
    PERFORM 1
    FROM public.oil_movements AS oil_movement
    WHERE oil_movement.idempotency_key = v_idempotency_key;
    IF FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Active checkout reservations already have oil settlement movements';
    END IF;

    v_after_ml := v_oil_reservation.remaining_quantity_ml - v_oil_reservation.quantity_ml;
    INSERT INTO public.oil_movements (
      lot_id,
      product_id,
      type,
      quantity_delta_ml,
      quantity_after_ml,
      ref_type,
      ref_id,
      note,
      idempotency_key
    )
    VALUES (
      v_oil_reservation.lot_id,
      v_oil_reservation.product_id,
      'sale',
      -v_oil_reservation.quantity_ml,
      v_after_ml,
      'commerce_order',
      p_order_id::text,
      'Storefront order oil settlement',
      v_idempotency_key
    );

    UPDATE public.oil_lots AS oil_lot
    SET
      remaining_quantity_ml = oil_lot.remaining_quantity_ml - v_oil_reservation.quantity_ml,
      reserved_quantity_ml = oil_lot.reserved_quantity_ml - v_oil_reservation.quantity_ml,
      version = oil_lot.version + 1,
      updated_at = p_settled_at
    WHERE oil_lot.id = v_oil_reservation.lot_id
      AND oil_lot.remaining_quantity_ml >= v_oil_reservation.quantity_ml
      AND oil_lot.reserved_quantity_ml >= v_oil_reservation.quantity_ml;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Reserved oil balance is inconsistent';
    END IF;
  END LOOP;

  UPDATE public.stock_reservations AS reservation
  SET
    status = 'consumed'::public.stock_reservation_status,
    released_at = p_settled_at,
    release_reason = 'order_settled'
  WHERE reservation.checkout_session_id = p_checkout_session_id
    AND reservation.status = 'active';

  UPDATE public.oil_reservations AS oil_reservation
  SET
    status = 'consumed'::public.stock_reservation_status,
    released_at = p_settled_at,
    release_reason = 'order_settled'
  WHERE oil_reservation.checkout_session_id = p_checkout_session_id
    AND oil_reservation.status = 'active';

  RETURN QUERY SELECT v_active_count, false;
END;
$$;
--> statement-breakpoint

-- Cashfree order identities are supplied only by the separately credentialed
-- payment-finalizer role. The normal storefront runtime creates the immutable
-- attempt shell, but cannot write a provider order/session identifier or move
-- the checkout into payment_pending. This binds the provider response exactly
-- once before the customer can pay.
CREATE FUNCTION public.bind_storefront_cashfree_payment_attempt(
  p_payment_attempt_id uuid,
  p_provider_order_id text,
  p_provider_session_id text,
  p_bound_at timestamptz
)
RETURNS TABLE(
  order_id uuid,
  checkout_session_id uuid,
  idempotent boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_initial_order_id uuid;
  v_checkout record;
  v_order record;
  v_attempt record;
  v_settings record;
  v_order_item_count integer;
  v_invalid_item_count integer;
  v_reservation_mismatch_count integer;
  v_oil_reservation_count integer;
  v_active_oil_reservation_count integer;
  v_oil_reservation_mismatch_count integer;
  v_subtotal_amount_minor bigint;
  v_expected_shipping_amount_minor integer;
BEGIN
  IF p_payment_attempt_id IS NULL
    OR p_provider_order_id IS NULL
    OR btrim(p_provider_order_id) = ''
    OR p_provider_session_id IS NULL
    OR btrim(p_provider_session_id) = ''
    OR p_bound_at IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Cashfree payment binding requires the attempt, provider order, payment session, and timestamp';
  END IF;

  -- The normal runtime has no UPDATE grant on order_id. Read the immutable
  -- relationship first, then use the checkout -> order -> attempt lock order
  -- shared with finalization to serialize all payment transitions.
  SELECT payment_attempt.order_id
  INTO v_initial_order_id
  FROM public.payment_attempts AS payment_attempt
  WHERE payment_attempt.id = p_payment_attempt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Cashfree payment attempt was not found';
  END IF;

  SELECT checkout_session.id, checkout_session.status, checkout_session.expires_at
  INTO v_checkout
  FROM public.commerce_orders AS commerce_order
  INNER JOIN public.checkout_sessions AS checkout_session
    ON checkout_session.id = commerce_order.checkout_session_id
  WHERE commerce_order.id = v_initial_order_id
  FOR UPDATE OF checkout_session;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Cashfree payment checkout was not found';
  END IF;

  SELECT commerce_order.id,
         commerce_order.status,
         commerce_order.payment_state,
         commerce_order.currency,
         commerce_order.subtotal_amount_minor,
         commerce_order.shipping_amount_minor,
         commerce_order.tax_amount_minor,
         commerce_order.discount_amount_minor,
         commerce_order.total_amount_minor
  INTO v_order
  FROM public.commerce_orders AS commerce_order
  WHERE commerce_order.id = v_initial_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Cashfree payment order was not found';
  END IF;

  SELECT payment_attempt.id,
         payment_attempt.order_id,
         payment_attempt.provider,
         payment_attempt.status,
         payment_attempt.provider_order_id,
         payment_attempt.provider_session_id,
         payment_attempt.amount_minor,
         payment_attempt.currency
  INTO v_attempt
  FROM public.payment_attempts AS payment_attempt
  WHERE payment_attempt.id = p_payment_attempt_id
  FOR UPDATE;
  IF NOT FOUND
    OR v_attempt.order_id <> v_order.id
    OR v_attempt.provider <> 'cashfree'
    OR v_attempt.amount_minor <> v_order.total_amount_minor
    OR v_attempt.currency <> v_order.currency
    OR v_order.currency <> 'INR' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cashfree payment attempt does not match its immutable order total';
  END IF;

  IF v_checkout.expires_at <= p_bound_at
    OR v_checkout.expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cashfree payment checkout expired before its provider session could be bound';
  END IF;

  IF v_attempt.status = 'pending' THEN
    IF v_attempt.provider_order_id IS NOT DISTINCT FROM p_provider_order_id
      AND v_attempt.provider_session_id IS NOT DISTINCT FROM p_provider_session_id
      AND v_order.status = 'pending'
      AND v_order.payment_state = 'prepaid_pending'
      AND v_checkout.status = 'payment_pending' THEN
      RETURN QUERY SELECT v_order.id, v_checkout.id, true;
      RETURN;
    END IF;
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cashfree payment attempt is already bound to another provider session';
  END IF;

  IF v_attempt.status <> 'created'
    OR v_attempt.provider_order_id IS NOT NULL
    OR v_attempt.provider_session_id IS NOT NULL
    OR v_order.status <> 'pending'
    OR v_order.payment_state <> 'unpaid'
    OR v_checkout.status <> 'open' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cashfree payment attempt is not eligible for provider binding';
  END IF;

  -- The normal role can only create a shell. Before a provider identity is
  -- bound, derive the payable amount from the currently approved catalog and
  -- require it to exactly match both the immutable order lines and the active
  -- stock reservation set. A forged normal-role INSERT therefore cannot turn
  -- an arbitrary order total into a payable/finalizable sale.
  SELECT count(*)::integer,
         coalesce(sum(order_item.line_total_amount_minor), 0)
  INTO v_order_item_count, v_subtotal_amount_minor
  FROM public.commerce_order_items AS order_item
  WHERE order_item.order_id = v_order.id;

  SELECT count(*)::integer
  INTO v_invalid_item_count
  FROM public.commerce_order_items AS order_item
  LEFT JOIN public.product_variants AS product_variant
    ON product_variant.id = order_item.variant_id
  LEFT JOIN public.products AS product
    ON product.id = product_variant.product_id
  LEFT JOIN public.product_publications AS publication
    ON publication.product_id = product.id
  LEFT JOIN public.variant_prices AS price
    ON price.variant_id = product_variant.id
  WHERE order_item.order_id = v_order.id
    AND (
      order_item.variant_id IS NULL
      OR product_variant.id IS NULL
      OR product.status <> 'active'
      OR product_variant.status <> 'active'
      OR publication.status <> 'published'
      OR publication.legal_approved_at IS NULL
      OR publication.legal_approval_reference IS NULL
      OR publication.content_approved_at IS NULL
      OR publication.content_approval_reference IS NULL
      OR publication.media_approved_at IS NULL
      OR publication.media_approval_reference IS NULL
      OR price.variant_id IS NULL
      OR price.active IS DISTINCT FROM true
      OR price.approved_at IS NULL
      OR price.approval_reference IS NULL
      OR price.currency <> 'INR'
      OR price.amount_minor <= 0
      OR order_item.sku_snapshot <> product_variant.sku
      OR order_item.size_ml_snapshot <> product_variant.size_ml
      OR order_item.product_name_snapshot IS DISTINCT FROM publication.public_name
      OR order_item.unit_price_amount_minor <> price.amount_minor
      OR order_item.line_total_amount_minor <> price.amount_minor * order_item.quantity
    );

  WITH order_quantities AS (
    SELECT order_item.variant_id,
           sum(order_item.quantity)::integer AS quantity,
           count(*)::integer AS line_count
    FROM public.commerce_order_items AS order_item
    WHERE order_item.order_id = v_order.id
    GROUP BY order_item.variant_id
  ), reservation_quantities AS (
    SELECT reservation.variant_id, reservation.quantity
    FROM public.stock_reservations AS reservation
    WHERE reservation.checkout_session_id = v_checkout.id
      AND reservation.status = 'active'
    FOR UPDATE
  )
  SELECT count(*)::integer
  INTO v_reservation_mismatch_count
  FROM order_quantities
  FULL OUTER JOIN reservation_quantities
    ON reservation_quantities.variant_id = order_quantities.variant_id
  WHERE order_quantities.variant_id IS NULL
    OR reservation_quantities.variant_id IS NULL
    OR order_quantities.quantity IS DISTINCT FROM reservation_quantities.quantity
    OR order_quantities.line_count <> 1;

  SELECT count(*)::integer,
         count(*) FILTER (WHERE oil_reservation.status = 'active')::integer
  INTO v_oil_reservation_count, v_active_oil_reservation_count
  FROM public.oil_reservations AS oil_reservation
  WHERE oil_reservation.checkout_session_id = v_checkout.id;

  WITH expected AS (
    SELECT product_variant.product_id,
           sum((product_variant.size_ml * reservation.quantity + 1) / 2)::integer AS quantity_ml
    FROM public.stock_reservations AS reservation
    INNER JOIN public.product_variants AS product_variant
      ON product_variant.id = reservation.variant_id
    WHERE reservation.checkout_session_id = v_checkout.id
      AND reservation.status = 'active'
    GROUP BY product_variant.product_id
  ), actual AS (
    SELECT oil_reservation.product_id,
           sum(oil_reservation.quantity_ml)::integer AS quantity_ml
    FROM public.oil_reservations AS oil_reservation
    WHERE oil_reservation.checkout_session_id = v_checkout.id
      AND oil_reservation.status = 'active'
    GROUP BY oil_reservation.product_id
  )
  SELECT count(*)::integer
  INTO v_oil_reservation_mismatch_count
  FROM (
    (SELECT expected.product_id, expected.quantity_ml FROM expected
     EXCEPT
     SELECT actual.product_id, actual.quantity_ml FROM actual)
    UNION ALL
    (SELECT actual.product_id, actual.quantity_ml FROM actual
     EXCEPT
     SELECT expected.product_id, expected.quantity_ml FROM expected)
  ) AS mismatch;

  SELECT commerce_settings.checkout_enabled,
         commerce_settings.currency,
         commerce_settings.flat_shipping_amount_minor,
         commerce_settings.free_shipping_threshold_minor,
         commerce_settings.tax_treatment,
         commerce_settings.tax_policy_approved,
         commerce_settings.tax_approval_reference,
         commerce_settings.catalog_legal_approved,
         commerce_settings.legal_approval_reference,
         commerce_settings.support_channel,
         commerce_settings.support_operations_approved,
         commerce_settings.shipping_policy_approved,
         commerce_settings.returns_policy_approved,
         commerce_settings.cancellation_policy_approved
  INTO v_settings
  FROM public.commerce_settings AS commerce_settings
  WHERE commerce_settings.id = 'primary'
  FOR SHARE;
  IF NOT FOUND
    OR v_settings.checkout_enabled IS DISTINCT FROM true
    OR v_settings.currency <> 'INR'
    OR v_settings.flat_shipping_amount_minor IS NULL
    OR v_settings.free_shipping_threshold_minor IS NULL
    OR v_settings.tax_treatment <> 'prices_include_approved_tax'
    OR v_settings.tax_policy_approved IS DISTINCT FROM true
    OR v_settings.tax_approval_reference IS NULL
    OR v_settings.catalog_legal_approved IS DISTINCT FROM true
    OR v_settings.legal_approval_reference IS NULL
    OR v_settings.support_channel IS NULL
    OR v_settings.support_operations_approved IS DISTINCT FROM true
    OR v_settings.shipping_policy_approved IS DISTINCT FROM true
    OR v_settings.returns_policy_approved IS DISTINCT FROM true
    OR v_settings.cancellation_policy_approved IS DISTINCT FROM true THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cashfree payment binding requires the approved checkout policy';
  END IF;

  v_expected_shipping_amount_minor := CASE
    WHEN v_subtotal_amount_minor >= v_settings.free_shipping_threshold_minor THEN 0
    ELSE v_settings.flat_shipping_amount_minor
  END;
  IF v_order_item_count = 0
    OR v_invalid_item_count <> 0
    OR v_reservation_mismatch_count <> 0
    OR v_oil_reservation_count = 0
    OR v_active_oil_reservation_count <> v_oil_reservation_count
    OR v_oil_reservation_mismatch_count <> 0
    OR v_subtotal_amount_minor <> v_order.subtotal_amount_minor
    OR v_order.shipping_amount_minor <> v_expected_shipping_amount_minor
    OR v_order.tax_amount_minor <> 0
    OR v_order.discount_amount_minor <> 0
    OR v_order.total_amount_minor <> v_subtotal_amount_minor + v_expected_shipping_amount_minor THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cashfree payment intent does not match approved catalog prices, shipping, stock, and oil reservations';
  END IF;

  UPDATE public.payment_attempts AS payment_attempt
  SET
    status = 'pending'::public.payment_attempt_status,
    provider_order_id = p_provider_order_id,
    provider_session_id = p_provider_session_id,
    updated_at = p_bound_at
  WHERE payment_attempt.id = p_payment_attempt_id;

  UPDATE public.commerce_orders AS commerce_order
  SET
    payment_state = 'prepaid_pending'::public.order_payment_state,
    updated_at = p_bound_at
  WHERE commerce_order.id = v_order.id;

  UPDATE public.checkout_sessions AS checkout_session
  SET
    status = 'payment_pending'::public.checkout_status,
    updated_at = p_bound_at
  WHERE checkout_session.id = v_checkout.id;

  RETURN QUERY SELECT v_order.id, v_checkout.id, false;
END;
$$;
--> statement-breakpoint

-- Cashfree is independently verified by the application before it invokes
-- this separate capability. This routine then performs payment, order,
-- checkout, stock, and oil transitions atomically; the normal storefront
-- runtime cannot execute it or settle a prepaid-pending order.
CREATE FUNCTION public.finalize_storefront_cashfree_payment(
  p_payment_attempt_id uuid,
  p_order_id uuid,
  p_provider_order_id text,
  p_expected_amount_minor integer,
  p_payment_id text,
  p_finalized_at timestamptz
)
RETURNS TABLE(
  newly_finalized boolean,
  order_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_checkout record;
  v_order record;
  v_attempt record;
  v_confirmed_event_id uuid;
  v_next_order_status public.commerce_order_status;
  v_next_payment_state public.order_payment_state;
BEGIN
  IF p_payment_attempt_id IS NULL
    OR p_order_id IS NULL
    OR p_provider_order_id IS NULL
    OR btrim(p_provider_order_id) = ''
    OR p_expected_amount_minor IS NULL
    OR p_expected_amount_minor <= 0
    OR p_payment_id IS NULL
    OR btrim(p_payment_id) = ''
    OR p_finalized_at IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Cashfree finalization requires the verified attempt, order, provider order, amount, payment identifier, and timestamp';
  END IF;

  -- Follow the shared checkout → order → payment-attempt lock order. Every
  -- mutable relationship is then bound to the independently verified values
  -- supplied by the application, preventing a normal storefront role from
  -- racing a payment attempt onto another checkout or provider identity.
  SELECT checkout_session.id, checkout_session.status
  INTO v_checkout
  FROM public.commerce_orders AS commerce_order
  INNER JOIN public.checkout_sessions AS checkout_session
    ON checkout_session.id = commerce_order.checkout_session_id
  WHERE commerce_order.id = p_order_id
  FOR UPDATE OF checkout_session;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Cashfree payment checkout was not found';
  END IF;

  SELECT commerce_order.id,
         commerce_order.status,
         commerce_order.payment_state
  INTO v_order
  FROM public.commerce_orders AS commerce_order
  WHERE commerce_order.id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Cashfree payment order was not found';
  END IF;

  SELECT payment_attempt.id,
         payment_attempt.order_id,
         payment_attempt.provider,
         payment_attempt.status,
         payment_attempt.provider_order_id,
         payment_attempt.provider_payment_id,
         payment_attempt.amount_minor
  INTO v_attempt
  FROM public.payment_attempts AS payment_attempt
  WHERE payment_attempt.id = p_payment_attempt_id
  FOR UPDATE;
  IF NOT FOUND
    OR v_attempt.order_id <> v_order.id
    OR v_attempt.provider <> 'cashfree'
    OR v_attempt.provider_order_id IS DISTINCT FROM p_provider_order_id
    OR v_attempt.amount_minor <> p_expected_amount_minor THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cashfree payment attempt does not match the verified order, provider order, or amount';
  END IF;

  IF v_attempt.status = 'succeeded' THEN
    IF v_attempt.provider_payment_id <> p_payment_id THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Cashfree payment attempt is already bound to another payment';
    END IF;
    RETURN QUERY SELECT false, v_order.id;
    RETURN;
  END IF;

  IF v_attempt.status <> 'pending'
    OR v_order.status IN ('cancelled', 'returned')
    OR v_order.payment_state <> 'prepaid_pending'
    OR v_checkout.status <> 'payment_pending' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cashfree payment attempt is not eligible for finalization';
  END IF;

  PERFORM 1
  FROM public.settle_storefront_checkout_reservations(
    v_checkout.id,
    v_order.id,
    p_finalized_at
  );

  v_next_order_status := CASE
    WHEN v_order.status = 'pending' THEN 'confirmed'::public.commerce_order_status
    ELSE v_order.status
  END;
  v_next_payment_state := 'paid'::public.order_payment_state;

  UPDATE public.payment_attempts AS payment_attempt
  SET
    status = 'succeeded'::public.payment_attempt_status,
    provider_payment_id = p_payment_id,
    verified_at = p_finalized_at,
    last_reconciled_at = p_finalized_at,
    reconciliation_attempt_count = 0,
    next_reconcile_at = NULL,
    last_reconciliation_error_code = NULL,
    updated_at = p_finalized_at
  WHERE payment_attempt.id = p_payment_attempt_id;

  UPDATE public.commerce_orders AS commerce_order
  SET
    payment_state = v_next_payment_state,
    status = v_next_order_status,
    updated_at = p_finalized_at
  WHERE commerce_order.id = v_order.id;

  UPDATE public.checkout_sessions AS checkout_session
  SET
    status = 'completed'::public.checkout_status,
    completed_at = p_finalized_at,
    updated_at = p_finalized_at
  WHERE checkout_session.id = v_checkout.id
    AND checkout_session.status = 'payment_pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cashfree payment checkout is no longer payment pending';
  END IF;

  INSERT INTO public.commerce_order_events (
    order_id,
    event_type,
    from_status,
    to_status,
    idempotency_key
  )
  VALUES (
    v_order.id,
    'payment_confirmed',
    v_order.status,
    v_next_order_status,
    'payment-confirmed:' || p_payment_attempt_id::text
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_confirmed_event_id;

  IF v_confirmed_event_id IS NOT NULL THEN
    INSERT INTO public.notification_outbox (order_event_id, kind)
    VALUES (v_confirmed_event_id, 'order_confirmed')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY SELECT true, v_order.id;
END;
$$;
--> statement-breakpoint

-- Cancellation is the other half of payment finalization. The same narrow
-- capability that binds and settles Cashfree must atomically release its
-- holds before changing a provider-bound order to failed/cancelled; the normal
-- storefront role cannot race this transition against a valid settlement.
CREATE FUNCTION public.cancel_storefront_cashfree_payment_attempt(
  p_payment_attempt_id uuid,
  p_reason text,
  p_cancelled_at timestamptz
)
RETURNS TABLE(
  order_id uuid,
  checkout_session_id uuid,
  released_count integer,
  idempotent boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_initial_order_id uuid;
  v_checkout record;
  v_order record;
  v_attempt record;
  v_release record;
  v_event_id uuid;
  v_next_attempt_status public.payment_attempt_status;
  v_next_checkout_status public.checkout_status;
  v_event_type text;
  v_event_key text;
BEGIN
  IF p_payment_attempt_id IS NULL
    OR p_reason NOT IN ('payment_failed', 'expired')
    OR p_cancelled_at IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Cashfree cancellation requires a payment attempt, allowed reason, and timestamp';
  END IF;

  -- Keep the checkout -> order -> attempt lock order shared by binding and
  -- finalization. No caller can observe partial reservation release or a
  -- cancellation that conflicts with a concurrently verified payment.
  SELECT payment_attempt.order_id
  INTO v_initial_order_id
  FROM public.payment_attempts AS payment_attempt
  WHERE payment_attempt.id = p_payment_attempt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Cashfree payment attempt was not found';
  END IF;

  SELECT checkout_session.id,
         checkout_session.status,
         checkout_session.expires_at,
         checkout_session.cart_id
  INTO v_checkout
  FROM public.commerce_orders AS commerce_order
  INNER JOIN public.checkout_sessions AS checkout_session
    ON checkout_session.id = commerce_order.checkout_session_id
  WHERE commerce_order.id = v_initial_order_id
  FOR UPDATE OF checkout_session;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Cashfree payment checkout was not found';
  END IF;

  SELECT commerce_order.id,
         commerce_order.status,
         commerce_order.payment_state
  INTO v_order
  FROM public.commerce_orders AS commerce_order
  WHERE commerce_order.id = v_initial_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Cashfree payment order was not found';
  END IF;

  SELECT payment_attempt.id,
         payment_attempt.order_id,
         payment_attempt.provider,
         payment_attempt.status,
         payment_attempt.provider_payment_id
  INTO v_attempt
  FROM public.payment_attempts AS payment_attempt
  WHERE payment_attempt.id = p_payment_attempt_id
  FOR UPDATE;
  IF NOT FOUND
    OR v_attempt.order_id <> v_order.id
    OR v_attempt.provider <> 'cashfree' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cashfree payment attempt does not match its checkout order';
  END IF;

  IF v_attempt.status = 'succeeded' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'A succeeded Cashfree payment cannot be cancelled';
  END IF;

  IF v_attempt.status IN ('failed', 'cancelled') THEN
    IF v_order.status <> 'cancelled'
      OR v_order.payment_state <> 'failed'
      OR v_checkout.status NOT IN ('cancelled', 'expired') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Cancelled Cashfree payment state is inconsistent';
    END IF;
    RETURN QUERY SELECT v_order.id, v_checkout.id, 0, true;
    RETURN;
  END IF;

  IF v_attempt.status NOT IN ('created', 'pending')
    OR v_order.status <> 'pending'
    OR (
      v_attempt.status = 'created'
      AND (v_order.payment_state <> 'unpaid' OR v_checkout.status <> 'open')
    )
    OR (
      v_attempt.status = 'pending'
      AND (v_order.payment_state <> 'prepaid_pending' OR v_checkout.status <> 'payment_pending')
    ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cashfree payment attempt is not eligible for cancellation';
  END IF;

  IF p_reason = 'expired' AND v_checkout.expires_at > p_cancelled_at THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cashfree checkout cannot expire before its configured expiry';
  END IF;

  SELECT
    released_reservations.released_count,
    released_reservations.idempotent,
    released_reservations.has_consumed
  INTO v_release
  FROM public.release_storefront_checkout_reservations(
    v_checkout.id,
    p_reason,
    p_cancelled_at
  ) AS released_reservations;
  IF v_release.has_consumed THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'A consumed checkout reservation cannot be cancelled';
  END IF;

  v_next_attempt_status := CASE
    WHEN p_reason = 'expired' THEN 'cancelled'::public.payment_attempt_status
    ELSE 'failed'::public.payment_attempt_status
  END;
  v_next_checkout_status := CASE
    WHEN p_reason = 'expired' THEN 'expired'::public.checkout_status
    ELSE 'cancelled'::public.checkout_status
  END;
  v_event_type := CASE WHEN p_reason = 'expired' THEN 'checkout_expired' ELSE 'payment_failed' END;
  v_event_key := CASE
    WHEN p_reason = 'expired' THEN 'checkout-expired:' || v_checkout.id::text
    ELSE 'payment-session-failed:' || p_payment_attempt_id::text
  END;

  UPDATE public.payment_attempts AS payment_attempt
  SET
    status = v_next_attempt_status,
    updated_at = p_cancelled_at
  WHERE payment_attempt.id = p_payment_attempt_id
    AND payment_attempt.status IN ('created', 'pending');
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cashfree payment attempt changed during cancellation';
  END IF;

  UPDATE public.commerce_orders AS commerce_order
  SET
    status = 'cancelled'::public.commerce_order_status,
    payment_state = 'failed'::public.order_payment_state,
    cancelled_at = p_cancelled_at,
    updated_at = p_cancelled_at
  WHERE commerce_order.id = v_order.id
    AND commerce_order.status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cashfree order changed during cancellation';
  END IF;

  UPDATE public.checkout_sessions AS checkout_session
  SET
    status = v_next_checkout_status,
    updated_at = p_cancelled_at
  WHERE checkout_session.id = v_checkout.id
    AND checkout_session.status IN ('open', 'payment_pending');
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Cashfree checkout changed during cancellation';
  END IF;

  UPDATE public.commerce_carts AS commerce_cart
  SET status = 'active', updated_at = p_cancelled_at
  WHERE commerce_cart.id = v_checkout.cart_id;

  INSERT INTO public.commerce_order_events (
    order_id,
    event_type,
    from_status,
    to_status,
    idempotency_key
  )
  VALUES (
    v_order.id,
    v_event_type,
    'pending',
    'cancelled',
    v_event_key
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NOT NULL THEN
    INSERT INTO public.notification_outbox (order_event_id, kind)
    VALUES (v_event_id, 'order_cancelled')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY SELECT v_order.id, v_checkout.id, v_release.released_count, false;
END;
$$;
--> statement-breakpoint

-- A normal storefront database principal cannot advance payment state. Binding,
-- verified settlement, and cancellation are all separately credentialed
-- finalizer operations. session_user remains the original login even inside a
-- security-definer routine, while the registry keeps this policy independent
-- of deploy-specific role names.
CREATE FUNCTION public.enforce_storefront_payment_state_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_table_owner name;
  v_capability text;
BEGIN
  SELECT pg_get_userbyid(table_class.relowner)
  INTO v_table_owner
  FROM pg_catalog.pg_class AS table_class
  WHERE table_class.oid = TG_RELID;

  IF session_user = v_table_owner THEN
    RETURN NEW;
  END IF;

  SELECT capability
  INTO v_capability
  FROM public.runtime_capability_roles
  WHERE role_name = session_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Runtime principal is not registered for payment state changes';
  END IF;

  IF v_capability = 'payment_finalizer' THEN
    RETURN NEW;
  END IF;

  IF v_capability NOT IN ('storefront', 'ops') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Runtime principal has no payment-state transition capability';
  END IF;

  IF TG_TABLE_NAME = 'checkout_sessions' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Storefront runtime cannot transition a checkout payment state';
    END IF;
    IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Storefront runtime cannot set checkout completion time';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'commerce_orders' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
      AND NOT (
        v_capability = 'ops'
        AND (
          (OLD.status = 'confirmed' AND NEW.status IN ('processing', 'shipped'))
          OR (OLD.status = 'processing' AND NEW.status = 'shipped')
          OR (OLD.status = 'shipped' AND NEW.status IN ('delivered', 'returned'))
          OR (OLD.status = 'delivered' AND NEW.status = 'returned')
        )
      ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Runtime principal cannot transition this order state';
    END IF;
    IF NEW.payment_state IS DISTINCT FROM OLD.payment_state
      AND NOT (
        OLD.payment_state = 'paid'
          AND NEW.payment_state IN ('partially_refunded', 'refunded')
      ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Storefront runtime cannot change unpaid or prepaid order payment state';
    END IF;
    IF NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Storefront runtime cannot record an order cancellation';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'payment_attempts' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Storefront runtime cannot transition a payment attempt';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = 'Unexpected payment state transition trigger target';
END;
$$;
--> statement-breakpoint

CREATE TRIGGER checkout_sessions_storefront_payment_transition_guard
BEFORE UPDATE OF status, completed_at ON public.checkout_sessions
FOR EACH ROW EXECUTE FUNCTION public.enforce_storefront_payment_state_transition();
--> statement-breakpoint

CREATE TRIGGER commerce_orders_storefront_payment_transition_guard
BEFORE UPDATE OF status, payment_state, cancelled_at ON public.commerce_orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_storefront_payment_state_transition();
--> statement-breakpoint

CREATE TRIGGER payment_attempts_storefront_payment_transition_guard
BEFORE UPDATE OF status ON public.payment_attempts
FOR EACH ROW EXECUTE FUNCTION public.enforce_storefront_payment_state_transition();
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.reserve_storefront_checkout_stock(uuid, uuid[], integer[], timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_storefront_checkout_reservations(uuid, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_storefront_checkout_reservations(uuid, uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bind_storefront_cashfree_payment_attempt(uuid, text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_storefront_cashfree_payment(uuid, uuid, text, integer, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_storefront_cashfree_payment_attempt(uuid, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_storefront_payment_state_transition() FROM PUBLIC;
