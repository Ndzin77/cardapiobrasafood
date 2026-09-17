
-- Atomic function: claim a pending checkout for payment processing.
-- Prevents race condition between expire_pending_checkouts cron and payment-webhook.
-- Uses FOR UPDATE to serialize access — if the checkout was already expired/paid, returns NULL.
CREATE OR REPLACE FUNCTION public.claim_checkout_for_payment(
  p_checkout_id uuid,
  p_provider_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_checkout record;
  v_result jsonb;
BEGIN
  -- Lock the row and verify it's still pending
  SELECT * INTO v_checkout
    FROM pending_checkouts
   WHERE id = p_checkout_id
     AND status = 'pending'
   FOR UPDATE SKIP LOCKED;

  -- If not found (already expired, paid, or locked by another process), return NULL
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Atomically mark as paid
  UPDATE pending_checkouts
     SET status = 'paid',
         provider_reference = COALESCE(p_provider_reference, provider_reference),
         updated_at = now()
   WHERE id = p_checkout_id;

  -- Build result JSONB with all checkout fields
  v_result := jsonb_build_object(
    'id', v_checkout.id,
    'store_id', v_checkout.store_id,
    'items', v_checkout.items,
    'subtotal', v_checkout.subtotal,
    'delivery_fee', v_checkout.delivery_fee,
    'total', v_checkout.total,
    'customer_name', v_checkout.customer_name,
    'customer_phone', v_checkout.customer_phone,
    'customer_address', v_checkout.customer_address,
    'delivery_type', v_checkout.delivery_type,
    'notes', v_checkout.notes,
    'payment_method', v_checkout.payment_method,
    'provider', v_checkout.provider,
    'provider_reference', COALESCE(p_provider_reference, v_checkout.provider_reference)
  );

  RETURN v_result;
END;
$function$;
