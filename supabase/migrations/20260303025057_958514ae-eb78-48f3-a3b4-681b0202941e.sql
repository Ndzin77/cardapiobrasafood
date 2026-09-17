
-- Add fulfillment_mode column to products
ALTER TABLE public.products 
ADD COLUMN fulfillment_mode text NOT NULL DEFAULT 'instant';

-- Migrate existing data based on store's preorder_config
-- If product_mode = 'all' → all products of that store become 'both'
UPDATE public.products p
SET fulfillment_mode = 'both'
FROM public.stores s
WHERE p.store_id = s.id
  AND s.preorder_enabled = true
  AND (s.preorder_config->>'product_mode') = 'all';

-- If product_mode = 'selected' → listed product_ids become 'both'
UPDATE public.products p
SET fulfillment_mode = 'both'
FROM public.stores s
WHERE p.store_id = s.id
  AND s.preorder_enabled = true
  AND (s.preorder_config->>'product_mode') = 'selected'
  AND p.id::text IN (
    SELECT jsonb_array_elements_text(s.preorder_config->'product_ids')
  );

-- If product_mode = 'except' → all products become 'both' EXCEPT the listed ones
UPDATE public.products p
SET fulfillment_mode = 'both'
FROM public.stores s
WHERE p.store_id = s.id
  AND s.preorder_enabled = true
  AND (s.preorder_config->>'product_mode') = 'except'
  AND p.id::text NOT IN (
    SELECT jsonb_array_elements_text(s.preorder_config->'product_ids')
  );
