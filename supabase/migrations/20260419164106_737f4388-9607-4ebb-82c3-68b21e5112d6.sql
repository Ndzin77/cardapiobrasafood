
-- =========================================
-- 1. TABELA ingredient_purchases (LOTES)
-- =========================================
CREATE TABLE IF NOT EXISTS public.ingredient_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  quantity_purchased numeric NOT NULL CHECK (quantity_purchased > 0),
  quantity_remaining numeric NOT NULL CHECK (quantity_remaining >= 0),
  total_paid numeric NOT NULL CHECK (total_paid >= 0),
  cost_per_unit numeric NOT NULL CHECK (cost_per_unit >= 0),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ing_purchases_ingredient_fifo
  ON public.ingredient_purchases (ingredient_id, purchased_at)
  WHERE quantity_remaining > 0;

CREATE INDEX IF NOT EXISTS idx_ing_purchases_store
  ON public.ingredient_purchases (store_id);

ALTER TABLE public.ingredient_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners manage ingredient_purchases"
  ON public.ingredient_purchases FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = ingredient_purchases.store_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores s WHERE s.id = ingredient_purchases.store_id AND s.user_id = auth.uid()));

CREATE TRIGGER trg_ingredient_purchases_updated_at
  BEFORE UPDATE ON public.ingredient_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- 2. SEED: Cria lote inicial p/ insumos existentes
-- =========================================
INSERT INTO public.ingredient_purchases (
  ingredient_id, store_id, quantity_purchased, quantity_remaining,
  total_paid, cost_per_unit, purchased_at, notes
)
SELECT
  i.id,
  i.store_id,
  i.stock_quantity,
  i.stock_quantity,
  i.stock_quantity * i.cost_per_unit,
  i.cost_per_unit,
  i.created_at,
  'Lote inicial (migração automática)'
FROM public.ingredients i
WHERE i.stock_quantity > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.ingredient_purchases p WHERE p.ingredient_id = i.id
  );

-- =========================================
-- 3. FUNÇÃO: register_ingredient_purchase
-- =========================================
CREATE OR REPLACE FUNCTION public.register_ingredient_purchase(
  p_ingredient_id uuid,
  p_store_id uuid,
  p_quantity numeric,
  p_total_paid numeric,
  p_purchased_at timestamptz DEFAULT now(),
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_purchase_id uuid;
  v_cost_per_unit numeric;
  v_owns boolean;
BEGIN
  IF p_quantity <= 0 OR p_total_paid < 0 THEN
    RAISE EXCEPTION 'INVALID_PURCHASE_VALUES';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM stores s
    WHERE s.id = p_store_id AND s.user_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ingredients
    WHERE id = p_ingredient_id AND store_id = p_store_id
  ) THEN
    RAISE EXCEPTION 'INGREDIENT_NOT_FOUND';
  END IF;

  v_cost_per_unit := ROUND((p_total_paid / p_quantity)::numeric, 6);

  INSERT INTO ingredient_purchases (
    ingredient_id, store_id, quantity_purchased, quantity_remaining,
    total_paid, cost_per_unit, purchased_at, notes
  ) VALUES (
    p_ingredient_id, p_store_id, p_quantity, p_quantity,
    p_total_paid, v_cost_per_unit, p_purchased_at, p_notes
  )
  RETURNING id INTO v_purchase_id;

  -- Atualiza estoque do insumo (soma) e custo "próximo lote a sair"
  UPDATE ingredients i
  SET
    stock_quantity = COALESCE((
      SELECT SUM(quantity_remaining)
      FROM ingredient_purchases
      WHERE ingredient_id = i.id
    ), 0),
    cost_per_unit = COALESCE((
      SELECT cost_per_unit
      FROM ingredient_purchases
      WHERE ingredient_id = i.id AND quantity_remaining > 0
      ORDER BY purchased_at ASC
      LIMIT 1
    ), i.cost_per_unit),
    updated_at = now()
  WHERE i.id = p_ingredient_id;

  RETURN v_purchase_id;
END;
$$;

-- =========================================
-- 4. FUNÇÃO: consume_ingredient_fifo
-- =========================================
CREATE OR REPLACE FUNCTION public.consume_ingredient_fifo(
  p_ingredient_id uuid,
  p_quantity numeric
)
RETURNS numeric  -- custo total consumido
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_remaining_to_consume numeric := p_quantity;
  v_total_cost numeric := 0;
  v_lot record;
  v_take numeric;
  v_has_lots boolean;
  v_fallback_cost numeric;
BEGIN
  IF p_quantity <= 0 THEN RETURN 0; END IF;

  SELECT EXISTS(
    SELECT 1 FROM ingredient_purchases
    WHERE ingredient_id = p_ingredient_id AND quantity_remaining > 0
  ) INTO v_has_lots;

  -- Fallback: insumo antigo sem lote → usa cost_per_unit + decrementa stock_quantity direto
  IF NOT v_has_lots THEN
    SELECT cost_per_unit INTO v_fallback_cost
    FROM ingredients WHERE id = p_ingredient_id;

    UPDATE ingredients
    SET stock_quantity = GREATEST(0, stock_quantity - p_quantity),
        updated_at = now()
    WHERE id = p_ingredient_id;

    RETURN COALESCE(v_fallback_cost, 0) * p_quantity;
  END IF;

  -- FIFO: consome lote mais antigo primeiro
  FOR v_lot IN
    SELECT id, quantity_remaining, cost_per_unit
    FROM ingredient_purchases
    WHERE ingredient_id = p_ingredient_id AND quantity_remaining > 0
    ORDER BY purchased_at ASC, created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining_to_consume <= 0;

    v_take := LEAST(v_lot.quantity_remaining, v_remaining_to_consume);

    UPDATE ingredient_purchases
    SET quantity_remaining = quantity_remaining - v_take,
        updated_at = now()
    WHERE id = v_lot.id;

    v_total_cost := v_total_cost + (v_take * v_lot.cost_per_unit);
    v_remaining_to_consume := v_remaining_to_consume - v_take;
  END LOOP;

  -- Sincroniza ingredients.stock_quantity = SUM(remaining) + atualiza próximo custo
  UPDATE ingredients i
  SET
    stock_quantity = COALESCE((
      SELECT SUM(quantity_remaining)
      FROM ingredient_purchases
      WHERE ingredient_id = i.id
    ), 0),
    cost_per_unit = COALESCE((
      SELECT cost_per_unit
      FROM ingredient_purchases
      WHERE ingredient_id = i.id AND quantity_remaining > 0
      ORDER BY purchased_at ASC
      LIMIT 1
    ), i.cost_per_unit),
    updated_at = now()
  WHERE i.id = p_ingredient_id;

  RETURN v_total_cost;
END;
$$;

-- =========================================
-- 5. FUNÇÃO: get_ingredient_next_cost
-- =========================================
CREATE OR REPLACE FUNCTION public.get_ingredient_next_cost(p_ingredient_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COALESCE(
    (SELECT cost_per_unit
       FROM ingredient_purchases
      WHERE ingredient_id = p_ingredient_id
        AND quantity_remaining > 0
      ORDER BY purchased_at ASC
      LIMIT 1),
    (SELECT cost_per_unit FROM ingredients WHERE id = p_ingredient_id)
  );
$$;

-- =========================================
-- 6. ATUALIZA decrement_ingredients_on_sale para usar FIFO
-- =========================================
CREATE OR REPLACE FUNCTION public.decrement_ingredients_on_sale(p_items jsonb, p_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
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

    -- Insumos do produto base (FIFO)
    FOR v_pi IN
      SELECT pi.ingredient_id, pi.quantity_used
      FROM product_ingredients pi
      JOIN ingredients i ON i.id = pi.ingredient_id
      WHERE pi.product_id = v_product_id
        AND i.store_id = p_store_id
    LOOP
      PERFORM public.consume_ingredient_fifo(
        v_pi.ingredient_id,
        v_pi.quantity_used * v_quantity
      );
    END LOOP;

    -- Insumos dos adicionais selecionados (FIFO)
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
              PERFORM public.consume_ingredient_fifo(
                v_oci.ingredient_id,
                v_oci.quantity_used * v_quantity
              );
            END LOOP;
          END LOOP;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;
