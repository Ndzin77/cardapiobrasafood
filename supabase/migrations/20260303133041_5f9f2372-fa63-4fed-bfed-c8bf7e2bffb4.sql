
-- Add preorder metadata columns to pending_checkouts
ALTER TABLE public.pending_checkouts
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'instant',
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS scheduled_time text,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric,
  ADD COLUMN IF NOT EXISTS deposit_status text,
  ADD COLUMN IF NOT EXISTS has_mixed_cart boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_fee_mode text NOT NULL DEFAULT 'instant_only';

-- Update claim_checkout_for_payment to return new fields
CREATE OR REPLACE FUNCTION public.claim_checkout_for_payment(p_checkout_id uuid, p_provider_reference text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_checkout record;
  v_result jsonb;
BEGIN
  SELECT * INTO v_checkout
    FROM pending_checkouts
   WHERE id = p_checkout_id
     AND status = 'pending'
   FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE pending_checkouts
     SET status = 'paid',
         provider_reference = COALESCE(p_provider_reference, provider_reference),
         updated_at = now()
   WHERE id = p_checkout_id;

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
    'customer_maps_url', v_checkout.customer_maps_url,
    'delivery_type', v_checkout.delivery_type,
    'notes', v_checkout.notes,
    'payment_method', v_checkout.payment_method,
    'provider', v_checkout.provider,
    'provider_reference', COALESCE(p_provider_reference, v_checkout.provider_reference),
    'order_type', v_checkout.order_type,
    'scheduled_date', v_checkout.scheduled_date,
    'scheduled_time', v_checkout.scheduled_time,
    'deposit_amount', v_checkout.deposit_amount,
    'deposit_status', v_checkout.deposit_status,
    'has_mixed_cart', v_checkout.has_mixed_cart,
    'delivery_fee_mode', v_checkout.delivery_fee_mode
  );

  RETURN v_result;
END;
$function$;
