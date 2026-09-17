
-- Create customer_addresses table for the address book feature
CREATE TABLE public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'Casa',
  cep TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_customer_addresses_customer_store ON public.customer_addresses(customer_id, store_id);

-- Enable RLS (access via service role in edge function, deny all direct access)
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_select_customer_addresses" ON public.customer_addresses FOR SELECT USING (false);
CREATE POLICY "deny_insert_customer_addresses" ON public.customer_addresses FOR INSERT WITH CHECK (false);
CREATE POLICY "deny_update_customer_addresses" ON public.customer_addresses FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "deny_delete_customer_addresses" ON public.customer_addresses FOR DELETE USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_customer_addresses_updated_at
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
