-- Create content_pool table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  caption TEXT,
  sequence_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create scheduler_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS scheduler_config (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_running BOOLEAN DEFAULT FALSE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  start_time TEXT DEFAULT '09:00',
  end_time TEXT DEFAULT '21:00',
  interval_minutes INTEGER DEFAULT 60,
  current_sequence_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create table to track published posts history
CREATE TABLE IF NOT EXISTS reels_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_pool_id UUID REFERENCES content_pool(id) ON DELETE SET NULL,
  video_url TEXT,
  caption TEXT,
  ig_container_id TEXT,
  ig_media_id TEXT,
  status TEXT, -- PUBLISHED, FAILED
  error_message TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_pool_user_id ON content_pool(user_id);
CREATE INDEX IF NOT EXISTS idx_content_pool_sequence ON content_pool(user_id, sequence_index);
