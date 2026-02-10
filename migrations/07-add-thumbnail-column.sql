-- Add thumbnail_url column to content_pool table
ALTER TABLE content_pool 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Update RLS policies to allow access to this column (usually automatic for * but good to verify)
-- No generic policy change needed if 'SELECT *' is used
