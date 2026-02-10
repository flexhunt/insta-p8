-- 1. Create the 'reels' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reels', 'reels', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Enable RLS on objects (standard practice)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts or duplicates
DROP POLICY IF EXISTS "Public Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public Viewing" ON storage.objects;
DROP POLICY IF EXISTS "Public Deletion" ON storage.objects;
DROP POLICY IF EXISTS "Give public access to reels" ON storage.objects;

-- 4. Create new permissive policies for the 'reels' bucket
-- Allow anyone (public) to upload to 'reels'
CREATE POLICY "Public Uploads" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'reels');

-- Allow anyone (public) to view/download from 'reels'
CREATE POLICY "Public Viewing" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'reels');

-- Allow anyone (public) to delete from 'reels' (Optional, useful for cleanup)
CREATE POLICY "Public Deletion" 
ON storage.objects FOR DELETE 
TO public 
USING (bucket_id = 'reels');
