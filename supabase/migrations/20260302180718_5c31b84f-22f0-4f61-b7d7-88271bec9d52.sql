
-- Update claim_checkout_for_payment to include customer_maps_url
CREATE OR REPLACE FUNCTION public.claim_checkout_for_payment(p_checkout_id uuid, p_provider_reference text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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
    'provider_reference', COALESCE(p_provider_reference, v_checkout.provider_reference)
  );

  RETURN v_result;
END;
$$;
