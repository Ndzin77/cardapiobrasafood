
-- Add preorder columns to stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS preorder_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorder_config jsonb DEFAULT '{}'::jsonb;

-- Add preorder columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'instant',
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS scheduled_time text,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric,
  ADD COLUMN IF NOT EXISTS deposit_status text;
