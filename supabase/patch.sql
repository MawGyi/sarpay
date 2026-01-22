-- Add 'description' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'description') THEN
        ALTER TABLE books ADD COLUMN description TEXT;
    END IF;
END $$;

-- Add 'format_type' column if it doesn't exist (defaulting to 'epub' for existing records)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'format_type') THEN
        ALTER TABLE books ADD COLUMN format_type TEXT DEFAULT 'epub';
    END IF;
END $$;

-- Add 'file_size' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'file_size') THEN
        ALTER TABLE books ADD COLUMN file_size BIGINT;
    END IF;
END $$;
