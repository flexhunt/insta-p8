-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reels', 'reels', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public uploads to 'reels' bucket
CREATE POLICY "Public Uploads" 
ON storage.objects 
FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'reels');

-- Policy: Allow public viewing of 'reels' bucket
CREATE POLICY "Public Viewing" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'reels');

-- Policy: Allow public deletion (optional, for management)
CREATE POLICY "Public Deletion" 
ON storage.objects 
FOR DELETE 
TO public 
USING (bucket_id = 'reels');
