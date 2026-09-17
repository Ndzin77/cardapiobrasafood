
-- =============================================
-- SEED: Açaí do Nando — Loja completa de açaí
-- =============================================

-- 1. Update store info
UPDATE stores SET
  name = 'Açaí do Nando',
  slug = 'acai-do-nando',
  description = 'O melhor açaí artesanal de São Paulo! Frutas frescas da Amazônia, combinações irresistíveis e entrega rápida. 🍇',
  address = 'Av. Paulista, 1578 - Bela Vista, São Paulo - SP, 01310-200',
  google_maps_url = 'https://maps.app.goo.gl/AvPaulista1578',
  phone = '(11) 98765-4321',
  whatsapp = '5511987654321',
  whatsapp_message = 'Olá! Quero fazer um pedido de açaí! 🍇',
  instagram = '@acaidonando',
  theme_color = '#7C3AED',
  delivery_fee = 6.00,
  min_order = 15.00,
  estimated_time = '25-40 min',
  is_open = true,
  rating = 4.9,
  review_count = 847,
  accepted_payments = ARRAY['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'],
  help_button_enabled = true,
  help_button_message = 'Olá! Tenho uma dúvida sobre o cardápio de açaí.',
  checkout_mode = 'whatsapp',
  delivery_zone_enabled = true,
  preorder_enabled = true,
  preorder_config = '{"min_advance_hours":24,"max_advance_days":7,"daily_limit":10,"deposit_percent":50,"product_mode":"selected","product_ids":[],"blocked_days":[0],"blocked_dates":[],"time_slots":["10:00","14:00","18:00"],"customer_notice":"Encomendas de baldes de açaí devem ser feitas com 24h de antecedência. Confirmamos disponibilidade por WhatsApp. Depósito de 50% no ato do pedido.","delivery_fee_mode":"full_upfront"}'::jsonb,
  opening_hours = '[{"day":"Segunda","hours":"10:00 - 22:00","isOpen":true},{"day":"Terça","hours":"10:00 - 22:00","isOpen":true},{"day":"Quarta","hours":"10:00 - 22:00","isOpen":true},{"day":"Quinta","hours":"10:00 - 22:00","isOpen":true},{"day":"Sexta","hours":"10:00 - 23:00","isOpen":true},{"day":"Sábado","hours":"10:00 - 23:00","isOpen":true},{"day":"Domingo","hours":"12:00 - 20:00","isOpen":true}]'::jsonb,
  ordering_mode = 'hours_only',
  unavailable_mode = 'show_badge',
  unavailable_message = 'Produto temporariamente indisponível'
WHERE id = 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374';

-- 2. Remove existing categories/products for this store (clean slate)
DELETE FROM products WHERE store_id = 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374';
DELETE FROM categories WHERE store_id = 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374';
DELETE FROM delivery_zones WHERE store_id = 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374';

-- 3. Insert categories
INSERT INTO categories (id, store_id, name, icon, sort_order, is_active) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'Açaí Tradicional', '🍇', 1, true),
  ('a1000001-0000-0000-0000-000000000002', 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'Açaí Premium', '🥣', 2, true),
  ('a1000001-0000-0000-0000-000000000003', 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'Cremes & Sorvetes', '🍨', 3, true),
  ('a1000001-0000-0000-0000-000000000004', 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'Bebidas', '🥤', 4, true),
  ('a1000001-0000-0000-0000-000000000005', 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'Complementos', '🍫', 5, true),
  ('a1000001-0000-0000-0000-000000000006', 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'Encomendas', '🎂', 6, true);

-- 4. Insert products

-- AÇAÍ TRADICIONAL
INSERT INTO products (store_id, category_id, name, description, price, original_price, available, featured, sort_order, has_options, options, fulfillment_mode) VALUES
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000001',
 'Açaí 300ml', 'Açaí puro da Amazônia batido na hora. Escolha seus complementos favoritos!',
 14.90, NULL, true, true, 1, true,
 '[{"name":"Complementos Grátis (até 3)","required":false,"enabled":true,"min_select":0,"max_select":3,"choices":[{"name":"Granola","price_modifier":0,"enabled":true},{"name":"Banana","price_modifier":0,"enabled":true},{"name":"Morango","price_modifier":0,"enabled":true},{"name":"Leite Ninho","price_modifier":0,"enabled":true},{"name":"Leite Condensado","price_modifier":0,"enabled":true},{"name":"Mel","price_modifier":0,"enabled":true}]},{"name":"Extras","required":false,"enabled":true,"min_select":0,"max_select":5,"choices":[{"name":"Nutella","price_modifier":4.00,"enabled":true},{"name":"Paçoca","price_modifier":2.00,"enabled":true},{"name":"Amendoim","price_modifier":2.00,"enabled":true},{"name":"Gotas de Chocolate","price_modifier":3.00,"enabled":true},{"name":"Confete","price_modifier":3.00,"enabled":true},{"name":"Castanha de Caju","price_modifier":3.50,"enabled":true},{"name":"Kiwi","price_modifier":3.00,"enabled":true},{"name":"Manga","price_modifier":2.50,"enabled":true}]},{"name":"Calda","required":false,"enabled":true,"min_select":0,"max_select":1,"choices":[{"name":"Morango","price_modifier":0,"enabled":true},{"name":"Chocolate","price_modifier":0,"enabled":true},{"name":"Caramelo","price_modifier":0,"enabled":true},{"name":"Tutti-Frutti","price_modifier":0,"enabled":true}]}]'::jsonb,
 'instant'),

('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000001',
 'Açaí 500ml', 'Porção média do nosso açaí premium. Perfeito para uma refeição!',
 19.90, 22.90, true, true, 2, true,
 '[{"name":"Complementos Grátis (até 3)","required":false,"enabled":true,"min_select":0,"max_select":3,"choices":[{"name":"Granola","price_modifier":0,"enabled":true},{"name":"Banana","price_modifier":0,"enabled":true},{"name":"Morango","price_modifier":0,"enabled":true},{"name":"Leite Ninho","price_modifier":0,"enabled":true},{"name":"Leite Condensado","price_modifier":0,"enabled":true},{"name":"Mel","price_modifier":0,"enabled":true}]},{"name":"Extras","required":false,"enabled":true,"min_select":0,"max_select":5,"choices":[{"name":"Nutella","price_modifier":4.00,"enabled":true},{"name":"Paçoca","price_modifier":2.00,"enabled":true},{"name":"Amendoim","price_modifier":2.00,"enabled":true},{"name":"Gotas de Chocolate","price_modifier":3.00,"enabled":true},{"name":"Confete","price_modifier":3.00,"enabled":true},{"name":"Castanha de Caju","price_modifier":3.50,"enabled":true},{"name":"Kiwi","price_modifier":3.00,"enabled":true},{"name":"Manga","price_modifier":2.50,"enabled":true}]},{"name":"Calda","required":false,"enabled":true,"min_select":0,"max_select":1,"choices":[{"name":"Morango","price_modifier":0,"enabled":true},{"name":"Chocolate","price_modifier":0,"enabled":true},{"name":"Caramelo","price_modifier":0,"enabled":true},{"name":"Tutti-Frutti","price_modifier":0,"enabled":true}]}]'::jsonb,
 'instant'),

('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000001',
 'Açaí 700ml', 'Para quem ama açaí de verdade! Tamanho grande com muito sabor.',
 26.90, NULL, true, false, 3, true,
 '[{"name":"Complementos Grátis (até 4)","required":false,"enabled":true,"min_select":0,"max_select":4,"choices":[{"name":"Granola","price_modifier":0,"enabled":true},{"name":"Banana","price_modifier":0,"enabled":true},{"name":"Morango","price_modifier":0,"enabled":true},{"name":"Leite Ninho","price_modifier":0,"enabled":true},{"name":"Leite Condensado","price_modifier":0,"enabled":true},{"name":"Mel","price_modifier":0,"enabled":true}]},{"name":"Extras","required":false,"enabled":true,"min_select":0,"max_select":5,"choices":[{"name":"Nutella","price_modifier":4.00,"enabled":true},{"name":"Paçoca","price_modifier":2.00,"enabled":true},{"name":"Amendoim","price_modifier":2.00,"enabled":true},{"name":"Gotas de Chocolate","price_modifier":3.00,"enabled":true},{"name":"Confete","price_modifier":3.00,"enabled":true},{"name":"Castanha de Caju","price_modifier":3.50,"enabled":true}]},{"name":"Calda","required":false,"enabled":true,"min_select":0,"max_select":1,"choices":[{"name":"Morango","price_modifier":0,"enabled":true},{"name":"Chocolate","price_modifier":0,"enabled":true},{"name":"Caramelo","price_modifier":0,"enabled":true}]}]'::jsonb,
 'instant'),

('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000001',
 'Açaí 1 Litro', 'O maior da casa! Ideal para compartilhar ou para quem não brinca em serviço.',
 34.90, 39.90, true, true, 4, true,
 '[{"name":"Complementos Grátis (até 5)","required":false,"enabled":true,"min_select":0,"max_select":5,"choices":[{"name":"Granola","price_modifier":0,"enabled":true},{"name":"Banana","price_modifier":0,"enabled":true},{"name":"Morango","price_modifier":0,"enabled":true},{"name":"Leite Ninho","price_modifier":0,"enabled":true},{"name":"Leite Condensado","price_modifier":0,"enabled":true},{"name":"Mel","price_modifier":0,"enabled":true}]},{"name":"Extras","required":false,"enabled":true,"min_select":0,"max_select":6,"choices":[{"name":"Nutella","price_modifier":4.00,"enabled":true},{"name":"Paçoca","price_modifier":2.00,"enabled":true},{"name":"Amendoim","price_modifier":2.00,"enabled":true},{"name":"Gotas de Chocolate","price_modifier":3.00,"enabled":true},{"name":"Confete","price_modifier":3.00,"enabled":true},{"name":"Castanha de Caju","price_modifier":3.50,"enabled":true},{"name":"Kiwi","price_modifier":3.00,"enabled":true},{"name":"Manga","price_modifier":2.50,"enabled":true},{"name":"Cupuaçu","price_modifier":3.00,"enabled":true}]},{"name":"Calda","required":false,"enabled":true,"min_select":0,"max_select":2,"choices":[{"name":"Morango","price_modifier":0,"enabled":true},{"name":"Chocolate","price_modifier":0,"enabled":true},{"name":"Caramelo","price_modifier":0,"enabled":true},{"name":"Tutti-Frutti","price_modifier":0,"enabled":true}]}]'::jsonb,
 'instant');

-- AÇAÍ PREMIUM
INSERT INTO products (store_id, category_id, name, description, price, available, featured, sort_order, has_options, options, fulfillment_mode) VALUES
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000002',
 'Açaí Tropical 500ml', 'Açaí com manga, kiwi, morango e granola premium. Uma explosão tropical!',
 27.90, true, true, 1, true,
 '[{"name":"Base","required":true,"enabled":true,"min_select":1,"max_select":1,"choices":[{"name":"Açaí Puro","price_modifier":0,"enabled":true},{"name":"Açaí com Cupuaçu","price_modifier":2.00,"enabled":true},{"name":"Açaí com Guaraná","price_modifier":0,"enabled":true}]},{"name":"Extras Premium","required":false,"enabled":true,"min_select":0,"max_select":3,"choices":[{"name":"Whey Protein","price_modifier":5.00,"enabled":true},{"name":"Pasta de Amendoim","price_modifier":4.00,"enabled":true},{"name":"Chia","price_modifier":3.00,"enabled":true},{"name":"Mel Orgânico","price_modifier":3.50,"enabled":true}]}]'::jsonb,
 'instant'),

('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000002',
 'Açaí Fitness 500ml', 'Açaí com whey protein, banana, aveia e mel. Pós-treino perfeito! 💪',
 29.90, true, false, 2, true,
 '[{"name":"Proteína","required":true,"enabled":true,"min_select":1,"max_select":1,"choices":[{"name":"Whey Baunilha","price_modifier":0,"enabled":true},{"name":"Whey Chocolate","price_modifier":0,"enabled":true},{"name":"Whey Morango","price_modifier":0,"enabled":true},{"name":"Sem Whey","price_modifier":-5.00,"enabled":true}]},{"name":"Extras Fitness","required":false,"enabled":true,"min_select":0,"max_select":3,"choices":[{"name":"Pasta de Amendoim","price_modifier":4.00,"enabled":true},{"name":"Chia","price_modifier":3.00,"enabled":true},{"name":"Granola Low Carb","price_modifier":3.50,"enabled":true},{"name":"Cacau Nibs","price_modifier":4.00,"enabled":true}]}]'::jsonb,
 'instant'),

('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000002',
 'Açaí Nutella Lovers 500ml', 'Açaí coberto com Nutella, morangos frescos e farofa de castanha. Irresistível!',
 32.90, true, true, 3, false, '[]'::jsonb, 'instant'),

('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000002',
 'Açaí na Tigela Premium', 'Tigela artesanal com açaí, frutas frescas da estação, granola crocante e mel orgânico.',
 35.90, true, false, 4, true,
 '[{"name":"Frutas da Estação","required":false,"enabled":true,"min_select":0,"max_select":4,"choices":[{"name":"Morango","price_modifier":0,"enabled":true},{"name":"Banana","price_modifier":0,"enabled":true},{"name":"Kiwi","price_modifier":0,"enabled":true},{"name":"Manga","price_modifier":0,"enabled":true},{"name":"Mirtilo","price_modifier":2.00,"enabled":true},{"name":"Framboesa","price_modifier":2.50,"enabled":true}]}]'::jsonb,
 'instant');

-- CREMES & SORVETES
INSERT INTO products (store_id, category_id, name, description, price, available, featured, sort_order, has_options, options, fulfillment_mode) VALUES
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000003',
 'Creme de Cupuaçu 300ml', 'Creme artesanal de cupuaçu da Amazônia. Sabor único e refrescante!',
 16.90, true, false, 1, true,
 '[{"name":"Complementos","required":false,"enabled":true,"min_select":0,"max_select":2,"choices":[{"name":"Leite Condensado","price_modifier":0,"enabled":true},{"name":"Granola","price_modifier":0,"enabled":true},{"name":"Castanha do Pará","price_modifier":3.00,"enabled":true}]}]'::jsonb,
 'instant'),

('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000003',
 'Creme de Tapioca 300ml', 'Creme de tapioca com leite condensado e coco ralado. Tradição nordestina!',
 15.90, true, false, 2, false, '[]'::jsonb, 'instant'),

('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000003',
 'Sorvete Artesanal 2 Bolas', 'Sorvete artesanal — escolha entre açaí, cupuaçu, tapioca ou chocolate belga.',
 12.90, true, false, 3, true,
 '[{"name":"Sabores","required":true,"enabled":true,"min_select":1,"max_select":2,"choices":[{"name":"Açaí","price_modifier":0,"enabled":true},{"name":"Cupuaçu","price_modifier":0,"enabled":true},{"name":"Tapioca","price_modifier":0,"enabled":true},{"name":"Chocolate Belga","price_modifier":0,"enabled":true},{"name":"Morango","price_modifier":0,"enabled":true}]}]'::jsonb,
 'instant');

-- BEBIDAS
INSERT INTO products (store_id, category_id, name, description, price, available, sort_order, has_options, options, fulfillment_mode) VALUES
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000004',
 'Suco Natural 500ml', 'Suco espremido na hora. Frutas frescas e sem conservantes!',
 9.90, true, 1, true,
 '[{"name":"Sabor","required":true,"enabled":true,"min_select":1,"max_select":1,"choices":[{"name":"Laranja","price_modifier":0,"enabled":true},{"name":"Maracujá","price_modifier":0,"enabled":true},{"name":"Abacaxi com Hortelã","price_modifier":0,"enabled":true},{"name":"Manga","price_modifier":0,"enabled":true},{"name":"Morango","price_modifier":1.00,"enabled":true}]}]'::jsonb,
 'instant'),

('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000004',
 'Vitamina de Açaí 400ml', 'Vitamina cremosa de açaí com banana e leite. Energia pura!',
 15.90, true, 2, false, '[]'::jsonb, 'instant'),

('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000004',
 'Água de Coco 500ml', 'Água de coco natural e gelada.',
 7.90, true, 3, false, '[]'::jsonb, 'instant'),

('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000004',
 'Água Mineral', 'Com ou sem gás. 500ml.',
 4.90, true, 4, false, '[]'::jsonb, 'instant');

-- COMPLEMENTOS
INSERT INTO products (store_id, category_id, name, description, price, available, sort_order, fulfillment_mode) VALUES
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000005',
 'Granola Premium 100g', 'Granola artesanal crocante com castanhas e mel.', 6.90, true, 1, 'instant'),
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000005',
 'Nutella Pote 50g', 'Porção individual de Nutella para acompanhar seu açaí.', 8.90, true, 2, 'instant'),
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000005',
 'Leite Ninho Sachê', 'Sachê de leite ninho para polvilhar no açaí.', 4.90, true, 3, 'instant');

-- ENCOMENDAS (preorder)
INSERT INTO products (store_id, category_id, name, description, price, available, featured, sort_order, has_options, options, fulfillment_mode, min_order_quantity) VALUES
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000006',
 'Balde de Açaí 2L', 'Balde de 2 litros de açaí puro. Perfeito para festas e eventos! Requer agendamento com 24h de antecedência.',
 59.90, true, false, 1, true,
 '[{"name":"Complementos para o Balde","required":false,"enabled":true,"min_select":0,"max_select":3,"choices":[{"name":"Granola 500g","price_modifier":12.00,"enabled":true},{"name":"Leite Ninho 200g","price_modifier":10.00,"enabled":true},{"name":"Frutas Frescas Sortidas","price_modifier":15.00,"enabled":true},{"name":"Calda de Chocolate 300ml","price_modifier":8.00,"enabled":true}]}]'::jsonb,
 'preorder', 1),

('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'a1000001-0000-0000-0000-000000000006',
 'Balde de Açaí 5L', 'Balde de 5 litros de açaí puro. Para festas grandes e confraternizações! Requer agendamento.',
 129.90, true, false, 2, true,
 '[{"name":"Complementos para o Balde","required":false,"enabled":true,"min_select":0,"max_select":5,"choices":[{"name":"Granola 1kg","price_modifier":20.00,"enabled":true},{"name":"Leite Ninho 400g","price_modifier":18.00,"enabled":true},{"name":"Frutas Frescas Sortidas","price_modifier":25.00,"enabled":true},{"name":"Calda de Chocolate 500ml","price_modifier":12.00,"enabled":true},{"name":"Kit Festa (copos + colheres)","price_modifier":15.00,"enabled":true}]}]'::jsonb,
 'preorder', 1);

-- 5. Insert delivery zones
INSERT INTO delivery_zones (store_id, label, zone_type, config, delivery_fee, is_active, sort_order) VALUES
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'Bela Vista / Paraíso', 'neighborhood',
 '{"neighborhoods":["Bela Vista","Paraíso","Vila Mariana"]}'::jsonb,
 5.00, true, 1),
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'Consolação / Jardins', 'neighborhood',
 '{"neighborhoods":["Consolação","Jardins","Jardim Paulista","Cerqueira César"]}'::jsonb,
 8.00, true, 2),
('c75fc2c2-7f12-4254-a1b2-7a6220a8f374', 'Liberdade / Aclimação', 'neighborhood',
 '{"neighborhoods":["Liberdade","Aclimação","Cambuci","Ipiranga"]}'::jsonb,
 10.00, true, 3);

-- 6. Update preorder product_ids
UPDATE stores
SET preorder_config = jsonb_set(
  preorder_config,
  '{product_ids}',
  (SELECT COALESCE(jsonb_agg(id::text), '[]'::jsonb) FROM products
   WHERE store_id = 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374'
   AND fulfillment_mode = 'preorder')
)
WHERE id = 'c75fc2c2-7f12-4254-a1b2-7a6220a8f374';
