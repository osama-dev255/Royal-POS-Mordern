-- Migration to create storage bucket for expense voucher PDF attachments
-- Date: 2026-07-26

-- Create expense-voucher-pdfs bucket (public for viewing/downloading)
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-voucher-pdfs', 'expense-voucher-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO authenticated;

-- Allow public read access to expense voucher PDFs
CREATE POLICY "Allow public read access to expense-voucher-pdfs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'expense-voucher-pdfs');

-- Allow authenticated users to upload PDFs
CREATE POLICY "Allow authenticated users to upload expense voucher PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'expense-voucher-pdfs');

-- Allow authenticated users to delete their own PDFs
CREATE POLICY "Allow users to delete their own expense voucher PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'expense-voucher-pdfs' AND auth.uid() = owner);
