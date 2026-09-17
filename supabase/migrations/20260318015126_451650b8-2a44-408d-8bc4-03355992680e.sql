
-- Update store logo and cover
UPDATE stores SET
  logo_url = 'https://mqbhbarhosxfuivuksvr.supabase.co/storage/v1/object/public/store-assets/c75fc2c2-7f12-4254-a1b2-7a6220a8f374/logo.png',
  cover_image_url = 'https://mqbhbarhosxfuivuksvr.supabase.co/storage/v1/object/public/store-assets/c75fc2c2-7f12-4254-a1b2-7a6220a8f374/cover.jpg'
WHERE id = 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374';

-- Açaí Tradicional products (cat 01)
UPDATE products SET image_url = 'https://mqbhbarhosxfuivuksvr.supabase.co/storage/v1/object/public/store-assets/c75fc2c2-7f12-4254-a1b2-7a6220a8f374/acai-tradicional.jpg'
WHERE store_id = 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374' AND category_id = 'a1000001-0000-0000-0000-000000000001';

-- Açaí Premium products (cat 02)
UPDATE products SET image_url = 'https://mqbhbarhosxfuivuksvr.supabase.co/storage/v1/object/public/store-assets/c75fc2c2-7f12-4254-a1b2-7a6220a8f374/acai-premium.jpg'
WHERE store_id = 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374' AND category_id = 'a1000001-0000-0000-0000-000000000002';

-- Cremes & Sorvetes (cat 03)
UPDATE products SET image_url = 'https://mqbhbarhosxfuivuksvr.supabase.co/storage/v1/object/public/store-assets/c75fc2c2-7f12-4254-a1b2-7a6220a8f374/acai-creme.jpg'
WHERE store_id = 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374' AND category_id = 'a1000001-0000-0000-0000-000000000003';

-- Bebidas (cat 04)
UPDATE products SET image_url = 'https://mqbhbarhosxfuivuksvr.supabase.co/storage/v1/object/public/store-assets/c75fc2c2-7f12-4254-a1b2-7a6220a8f374/acai-bebida.jpg'
WHERE store_id = 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374' AND category_id = 'a1000001-0000-0000-0000-000000000004';

-- Complementos (cat 05)
UPDATE products SET image_url = 'https://mqbhbarhosxfuivuksvr.supabase.co/storage/v1/object/public/store-assets/c75fc2c2-7f12-4254-a1b2-7a6220a8f374/acai-complementos.jpg'
WHERE store_id = 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374' AND category_id = 'a1000001-0000-0000-0000-000000000005';

-- Encomendas (cat 06)
UPDATE products SET image_url = 'https://mqbhbarhosxfuivuksvr.supabase.co/storage/v1/object/public/store-assets/c75fc2c2-7f12-4254-a1b2-7a6220a8f374/acai-balde.jpg'
WHERE store_id = 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374' AND category_id = 'a1000001-0000-0000-0000-000000000006';

-- Enable upsell
UPDATE stores SET upsell_enabled = true, upsell_mode = 'auto'
WHERE id = 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374';

-- Upsell rules: when buying açaí, suggest complementos and bebidas
-- Açaí 300ml → suggest Granola, Nutella, Vitamina
INSERT INTO upsell_rules (store_id, source_type, source_id, suggested_product_ids, priority) VALUES
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'product', '7904ff40-a51b-4e29-86aa-51b839298270',
 ARRAY['f5e43435-7f87-4d88-8c08-4f480b79af6d','d8f8511a-248c-4851-9410-b1842585b471','b6323748-f266-4bdf-9993-5017ffc6e994']::uuid[], 1),
-- Açaí 500ml → suggest Granola, Nutella, Suco
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'product', 'd9a9ef50-dab7-4349-accf-5f874ba95c35',
 ARRAY['f5e43435-7f87-4d88-8c08-4f480b79af6d','d8f8511a-248c-4851-9410-b1842585b471','f0ca8652-76ca-4890-a8eb-11e7e2aa4ef5']::uuid[], 1),
-- Açaí 1L → suggest Granola, Leite Ninho, Água de Coco
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'product', 'ebf5004a-0283-4c42-957d-97b9f014017a',
 ARRAY['f5e43435-7f87-4d88-8c08-4f480b79af6d','c76b451f-240c-492f-89d0-a7f20463e639','fd57e344-8516-4cf0-b557-076021089feb']::uuid[], 1),
-- Açaí Tropical → suggest Suco, Água de Coco
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'product', 'a6b2e779-a713-491a-895f-4fe546ba7718',
 ARRAY['f0ca8652-76ca-4890-a8eb-11e7e2aa4ef5','fd57e344-8516-4cf0-b557-076021089feb','d8f8511a-248c-4851-9410-b1842585b471']::uuid[], 1),
-- Açaí Nutella Lovers → suggest Leite Ninho, Vitamina
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'product', '307eb470-abb1-40d0-ac23-3d1e6d703e11',
 ARRAY['c76b451f-240c-492f-89d0-a7f20463e639','b6323748-f266-4bdf-9993-5017ffc6e994','f5e43435-7f87-4d88-8c08-4f480b79af6d']::uuid[], 1);
