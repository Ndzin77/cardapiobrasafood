
-- Add upsell config to stores
ALTER TABLE public.stores 
  ADD COLUMN upsell_enabled boolean DEFAULT false,
  ADD COLUMN upsell_mode text DEFAULT 'auto';

-- Upsell rules for custom/personalized mode
CREATE TABLE public.upsell_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'product', -- 'product' or 'category'
  source_id uuid NOT NULL,
  suggested_product_ids uuid[] NOT NULL DEFAULT '{}',
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_upsell_rules_store ON public.upsell_rules(store_id);
CREATE INDEX idx_upsell_rules_source ON public.upsell_rules(source_type, source_id);

ALTER TABLE public.upsell_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view upsell rules"
  ON public.upsell_rules FOR SELECT USING (true);

CREATE POLICY "Store owners can manage upsell rules"
  ON public.upsell_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = upsell_rules.store_id AND stores.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = upsell_rules.store_id AND stores.user_id = auth.uid()));
