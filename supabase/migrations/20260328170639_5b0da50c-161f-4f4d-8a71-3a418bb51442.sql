DROP VIEW IF EXISTS public_stores;

CREATE VIEW public_stores AS
  SELECT id, name, slug, description, logo_url, cover_image_url,
         address, google_maps_url, phone, whatsapp, whatsapp_message,
         instagram, delivery_fee, min_order, estimated_time,
         accepted_payments, is_open, opening_hours, theme_color,
         rating, review_count, checkout_link, custom_payments,
         help_button_enabled, help_button_message, payment_icons,
         checkout_provider, checkout_config, checkout_mode,
         upsell_enabled, upsell_mode, preorder_enabled, preorder_config,
         show_watermark, unavailable_mode, unavailable_message,
         delivery_zone_enabled, ordering_mode, ordering_hours,
         created_at, updated_at
  FROM stores;