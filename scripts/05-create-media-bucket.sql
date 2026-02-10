-- Create the 'media' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS) - good practice even if policies are broad
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Allow Public Uploads to 'media' bucket
CREATE POLICY "Media Public Uploads" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'media');

-- 2. Allow Public Viewing/Select of 'media' bucket
CREATE POLICY "Media Public Viewing" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'media');

-- 3. Allow Public Update (optional, if you need to overwrite)
CREATE POLICY "Media Public Update" 
ON storage.objects FOR UPDATE
TO public 
USING (bucket_id = 'media');

-- 4. Allow Public Deletion (optional)
CREATE POLICY "Media Public Deletion" 
ON storage.objects FOR DELETE 
TO public 
USING (bucket_id = 'media');
