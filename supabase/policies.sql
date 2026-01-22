-- Enable RLS on books table if not already enabled
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Policy to allow public read access to books
DROP POLICY IF EXISTS "Public Access Books Table" ON books;
CREATE POLICY "Public Access Books Table"
ON books FOR SELECT
USING ( true );

-- Policy to allow public insert access to books
-- (Note: In a production app, you'd restrict this to authenticated users)
DROP POLICY IF EXISTS "Public Insert Books Table" ON books;
CREATE POLICY "Public Insert Books Table"
ON books FOR INSERT
WITH CHECK ( true );

-- Policy to allow public update access to books
DROP POLICY IF EXISTS "Public Update Books Table" ON books;
CREATE POLICY "Public Update Books Table"
ON books FOR UPDATE
USING ( true );

-- Policy to allow public delete access to books
DROP POLICY IF EXISTS "Public Delete Books Table" ON books;
CREATE POLICY "Public Delete Books Table"
ON books FOR DELETE
USING ( true );
