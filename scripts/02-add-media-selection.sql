-- Add media_selection field to automations table for reel selection
ALTER TABLE automations
ADD COLUMN IF NOT EXISTS media_selection JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS selected_reel_id TEXT DEFAULT NULL;

-- Create media cache table to store user reels
CREATE TABLE IF NOT EXISTS media_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  caption TEXT,
  image_url TEXT,
  video_url TEXT,
  permalink TEXT,
  media_product_type TEXT,
  timestamp TIMESTAMP WITH TIME ZONE,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_media_cache_user_id ON media_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_media_cache_media_id ON media_cache(media_id);
