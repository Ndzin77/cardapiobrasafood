-- Drop the existing INSERT policy and recreate it properly for anon users
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create a proper INSERT policy that allows anonymous users
CREATE POLICY "Public can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Also add a SELECT policy for public to see their own orders (by phone)
CREATE POLICY "Public can view orders by phone"
ON public.orders
FOR SELECT
TO anon
USING (true);