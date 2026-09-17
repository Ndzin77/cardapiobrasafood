
-- Tabela de insumos
CREATE TABLE public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'g',
  cost_per_unit numeric NOT NULL DEFAULT 0,
  stock_quantity numeric DEFAULT 0,
  min_stock_alert numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vinculação produto ↔ insumo
CREATE TABLE public.product_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity_used numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, ingredient_id)
);

-- RLS for ingredients
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view ingredients" ON public.ingredients
  FOR SELECT TO public USING (true);

CREATE POLICY "Store owners can manage ingredients" ON public.ingredients
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = ingredients.store_id AND stores.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = ingredients.store_id AND stores.user_id = auth.uid()));

-- RLS for product_ingredients
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view product_ingredients" ON public.product_ingredients
  FOR SELECT TO public USING (true);

CREATE POLICY "Store owners can manage product_ingredients" ON public.product_ingredients
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM products p JOIN stores s ON s.id = p.store_id
    WHERE p.id = product_ingredients.product_id AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM products p JOIN stores s ON s.id = p.store_id
    WHERE p.id = product_ingredients.product_id AND s.user_id = auth.uid()
  ));

-- Updated at trigger for ingredients
CREATE TRIGGER set_ingredients_updated_at
  BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to decrement ingredient stock when order is confirmed
CREATE OR REPLACE FUNCTION public.decrement_ingredients_on_sale(p_items jsonb, p_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item jsonb;
  v_product_id uuid;
  v_quantity int;
  v_pi record;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := COALESCE((v_item->>'quantity')::int, 1);

    FOR v_pi IN
      SELECT pi.ingredient_id, pi.quantity_used
      FROM product_ingredients pi
      WHERE pi.product_id = v_product_id
    LOOP
      UPDATE ingredients
      SET stock_quantity = GREATEST(0, stock_quantity - (v_pi.quantity_used * v_quantity))
      WHERE id = v_pi.ingredient_id
        AND store_id = p_store_id;
    END LOOP;
  END LOOP;
END;
$$;
