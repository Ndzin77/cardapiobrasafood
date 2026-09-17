-- Fix hash_driver_pin to include extensions schema for pgcrypto
CREATE OR REPLACE FUNCTION public.hash_driver_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.pin_hash ~ '^\d{1,6}$' THEN
    NEW.pin_hash := crypt(NEW.pin_hash, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

-- Fix driver_login to include extensions schema for pgcrypto
CREATE OR REPLACE FUNCTION public.driver_login(p_store_id uuid, p_phone text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_driver record;
BEGIN
  SELECT id, store_id, name, phone, is_active, pin_hash
  INTO v_driver
  FROM drivers
  WHERE store_id = p_store_id AND phone = p_phone AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_driver.pin_hash != crypt(p_pin, v_driver.pin_hash) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_driver.id,
    'name', v_driver.name,
    'phone', v_driver.phone,
    'store_id', v_driver.store_id
  );
END;
$$;