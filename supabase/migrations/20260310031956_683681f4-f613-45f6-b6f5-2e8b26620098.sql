ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS unavailable_mode text NOT NULL DEFAULT 'show_badge',
  ADD COLUMN IF NOT EXISTS unavailable_message text NOT NULL DEFAULT 'Produto temporariamente indisponível';