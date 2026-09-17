
-- Trigger to auto-hash pin_hash on INSERT if it's plaintext (4 digits)
CREATE OR REPLACE FUNCTION public.hash_driver_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If pin_hash looks like plaintext (4 digits), hash it
  IF NEW.pin_hash ~ '^\d{1,6}$' THEN
    NEW.pin_hash := crypt(NEW.pin_hash, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER hash_driver_pin_trigger
BEFORE INSERT OR UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.hash_driver_pin();
