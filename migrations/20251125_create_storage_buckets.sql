-- Migration to create storage buckets for the POS system
-- This script should be run in the Supabase SQL editor

-- Create assets bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create a default bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('default', 'default', true)
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO authenticated;

-- Create policies for assets bucket
CREATE POLICY "Allow public read access to assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assets');

CREATE POLICY "Allow authenticated users to upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assets');

CREATE POLICY "Allow users to delete their own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'assets' AND auth.uid() = owner);

-- Create policies for default bucket
CREATE POLICY "Allow public read access to default"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'default');

CREATE POLICY "Allow authenticated users to upload to default"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'default');

CREATE POLICY "Allow users to delete their own default files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'default' AND auth.uid() = owner);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';