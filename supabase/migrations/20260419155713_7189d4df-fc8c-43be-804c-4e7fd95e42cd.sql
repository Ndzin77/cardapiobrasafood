-- 1. Limpar registros orfaos antes de adicionar constraints
DELETE FROM product_ingredients WHERE product_id NOT IN (SELECT id FROM products);
DELETE FROM product_ingredients WHERE ingredient_id NOT IN (SELECT id FROM ingredients);
DELETE FROM option_choice_ingredients WHERE ingredient_id NOT IN (SELECT id FROM ingredients);
DELETE FROM option_choice_ingredients WHERE store_id NOT IN (SELECT id FROM stores);

-- 2. Adicionar FKs com CASCADE (idempotente via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_ingredients_product_fk') THEN
    ALTER TABLE product_ingredients
      ADD CONSTRAINT product_ingredients_product_fk
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_ingredients_ingredient_fk') THEN
    ALTER TABLE product_ingredients
      ADD CONSTRAINT product_ingredients_ingredient_fk
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'option_choice_ingredients_ingredient_fk') THEN
    ALTER TABLE option_choice_ingredients
      ADD CONSTRAINT option_choice_ingredients_ingredient_fk
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'option_choice_ingredients_store_fk') THEN
    ALTER TABLE option_choice_ingredients
      ADD CONSTRAINT option_choice_ingredients_store_fk
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Unique indexes (necessarios para upsert com onConflict)
CREATE UNIQUE INDEX IF NOT EXISTS product_ingredients_unique
  ON product_ingredients(product_id, ingredient_id);

CREATE UNIQUE INDEX IF NOT EXISTS option_choice_ingredients_unique
  ON option_choice_ingredients(store_id, option_group_name, choice_name, ingredient_id);