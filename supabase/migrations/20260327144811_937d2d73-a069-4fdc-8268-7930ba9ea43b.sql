-- 1. Create option_choice_ingredients table
CREATE TABLE public.option_choice_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  option_group_name text NOT NULL,
  choice_name text NOT NULL,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity_used numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, option_group_name, choice_name, ingredient_id)
);

-- 2. RLS
ALTER TABLE public.option_choice_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view option_choice_ingredients"
  ON public.option_choice_ingredients FOR SELECT
  TO public USING (true);

CREATE POLICY "Store owners can manage option_choice_ingredients"
  ON public.option_choice_ingredients FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM stores WHERE stores.id = option_choice_ingredients.store_id AND stores.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM stores WHERE stores.id = option_choice_ingredients.store_id AND stores.user_id = auth.uid()
  ));

-- 3. Update decrement_ingredients_on_sale to also process selected_options
CREATE OR REPLACE FUNCTION public.decrement_ingredients_on_sale(p_items jsonb, p_store_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item jsonb;
  v_product_id uuid;
  v_quantity int;
  v_pi record;
  v_opt jsonb;
  v_choice jsonb;
  v_oci record;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := COALESCE((v_item->>'quantity')::int, 1);

    -- Deduct base product ingredients (existing logic)
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

    -- NEW: Deduct ingredients for selected options/additions
    IF v_item ? 'selected_options' AND jsonb_typeof(v_item->'selected_options') = 'array' THEN
      FOR v_opt IN SELECT * FROM jsonb_array_elements(v_item->'selected_options')
      LOOP
        IF v_opt ? 'choices' AND jsonb_typeof(v_opt->'choices') = 'array' THEN
          FOR v_choice IN SELECT * FROM jsonb_array_elements(v_opt->'choices')
          LOOP
            FOR v_oci IN
              SELECT oci.ingredient_id, oci.quantity_used
              FROM option_choice_ingredients oci
              WHERE oci.store_id = p_store_id
                AND oci.option_group_name = (v_opt->>'group')
                AND oci.choice_name = (v_choice->>'name')
            LOOP
              UPDATE ingredients
              SET stock_quantity = GREATEST(0, stock_quantity - (v_oci.quantity_used * v_quantity))
              WHERE id = v_oci.ingredient_id
                AND store_id = p_store_id;
            END LOOP;
          END LOOP;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$function$;