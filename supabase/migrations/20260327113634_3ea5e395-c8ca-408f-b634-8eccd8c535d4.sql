
DROP POLICY IF EXISTS "Public can view drivers" ON public.drivers;

CREATE POLICY "Store owners can view drivers"
  ON public.drivers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = drivers.store_id
        AND stores.user_id = auth.uid()
    )
  );
