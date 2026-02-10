-- Create content_pool table to store clips for rotation
CREATE TABLE IF NOT EXISTS content_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  caption TEXT,
  cover_url TEXT,
  sequence_index SERIAL, -- Auto-incrementing integer for ordering
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create scheduler_config table for user settings
CREATE TABLE IF NOT EXISTS scheduler_config (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  interval_minutes INTEGER NOT NULL DEFAULT 240, -- Default 4 hours
  start_time TIME DEFAULT '09:00',
  end_time TIME DEFAULT '21:00',
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  current_sequence_index INTEGER DEFAULT 1,
  is_running BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reels_posts table to log published posts
CREATE TABLE IF NOT EXISTS reels_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_pool_id UUID REFERENCES content_pool(id) ON DELETE SET NULL,
  video_url TEXT NOT NULL,
  caption TEXT,
  ig_container_id TEXT,
  ig_media_id TEXT,
  status TEXT DEFAULT 'PENDING', -- PENDING, PUBLISHED, FAILED
  error_message TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient scheduler querying
CREATE INDEX IF NOT EXISTS idx_content_pool_user_sequence ON content_pool(user_id, sequence_index);
CREATE INDEX IF NOT EXISTS idx_scheduler_next_run ON scheduler_config(next_run_at);
CREATE INDEX IF NOT EXISTS idx_reels_posts_user_status ON reels_posts(user_id, status);

-- Storage bucket for Reels is handled via Supabase UI or generic storage policies, 
-- but we can add a helper policy if the bucket exists. 
-- Assuming bucket 'reels' will be created manually or is already there.
