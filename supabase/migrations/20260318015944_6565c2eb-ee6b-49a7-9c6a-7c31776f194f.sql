CREATE POLICY "Allow public upload to store-assets"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'store-assets');

CREATE POLICY "Allow public update store-assets"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'store-assets')
WITH CHECK (bucket_id = 'store-assets');