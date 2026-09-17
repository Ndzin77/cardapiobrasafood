-- Create orders table to track orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  delivery_type TEXT NOT NULL DEFAULT 'delivery',
  payment_method TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Public can insert orders (for customers placing orders)
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
WITH CHECK (true);

-- Store owners can view their orders
CREATE POLICY "Store owners can view orders"
ON public.orders
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM stores
  WHERE stores.id = orders.store_id
  AND stores.user_id = auth.uid()
));

-- Store owners can update their orders
CREATE POLICY "Store owners can update orders"
ON public.orders
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM stores
  WHERE stores.id = orders.store_id
  AND stores.user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_orders_store_id ON public.orders(store_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);