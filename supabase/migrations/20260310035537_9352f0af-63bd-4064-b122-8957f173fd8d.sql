
CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  zone_type text NOT NULL DEFAULT 'radius',
  label text NOT NULL DEFAULT 'Padrão',
  delivery_fee numeric NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}',
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view delivery zones"
  ON public.delivery_zones FOR SELECT TO public USING (true);

CREATE POLICY "Store owners manage delivery zones"
  ON public.delivery_zones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = delivery_zones.store_id AND stores.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = delivery_zones.store_id AND stores.user_id = auth.uid()));

ALTER TABLE public.stores ADD COLUMN delivery_zone_enabled boolean DEFAULT false;
