-- Add new fields to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS min_order_quantity integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS has_options boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS options jsonb DEFAULT '[]'::jsonb;

-- Add new fields to stores table for header customization
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS rating numeric(2,1) DEFAULT 4.8,
ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- Create storage bucket for product and store images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-assets',
  'store-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for storage
CREATE POLICY "Anyone can view store assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-assets');

CREATE POLICY "Authenticated users can upload their own assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'store-assets' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'store-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'store-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add comment for documentation
COMMENT ON COLUMN public.products.options IS 'Array of option groups: [{name: "Sabor", required: true, max_select: 1, choices: [{name: "Morango", price_modifier: 0}, {name: "Chocolate", price_modifier: 2}]}]';