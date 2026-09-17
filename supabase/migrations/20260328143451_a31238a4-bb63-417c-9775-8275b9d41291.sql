-- Drop the overly permissive public SELECT policy on stores table
-- All public access now goes through the public_stores view
-- Store owners still have full access via "Users can manage own store" policy
DROP POLICY IF EXISTS "Public can view stores" ON public.stores;