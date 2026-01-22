-- Enable the storage extension if not already enabled (usually enabled by default)
-- create extension if not exists "storage";

-- Create 'books' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', true)
ON CONFLICT (id) DO NOTHING;

-- Create 'covers' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read access to books
DROP POLICY IF EXISTS "Public Access Books" ON storage.objects;
CREATE POLICY "Public Access Books"
ON storage.objects FOR SELECT
USING ( bucket_id = 'books' );

-- Policy to allow uploading books (Update this for authentication later)
DROP POLICY IF EXISTS "Upload Books" ON storage.objects;
CREATE POLICY "Upload Books"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'books' );

-- Policy to allow public read access to covers
DROP POLICY IF EXISTS "Public Access Covers" ON storage.objects;
CREATE POLICY "Public Access Covers"
ON storage.objects FOR SELECT
USING ( bucket_id = 'covers' );

-- Policy to allow uploading covers
DROP POLICY IF EXISTS "Upload Covers" ON storage.objects;
CREATE POLICY "Upload Covers"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'covers' );

-- Policy to allow deleting files (optional, for development)
DROP POLICY IF EXISTS "Delete Books" ON storage.objects;
CREATE POLICY "Delete Books"
ON storage.objects FOR DELETE
USING ( bucket_id = 'books' );

DROP POLICY IF EXISTS "Delete Covers" ON storage.objects;
CREATE POLICY "Delete Covers"
ON storage.objects FOR DELETE
USING ( bucket_id = 'covers' );
