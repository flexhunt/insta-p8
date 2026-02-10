-- Add trigger_source column to automations table
ALTER TABLE automations 
ADD COLUMN trigger_source TEXT NOT NULL DEFAULT 'comment' 
CHECK (trigger_source IN ('comment', 'dm', 'story'));

-- Migrate existing data based on current trigger_type and specific_media_id
UPDATE automations
SET trigger_source = CASE
  -- Reply-all is always comment-based
  WHEN trigger_type = 'reply_all_comments' THEN 'comment'
  
  -- Keywords with specific media = comments
  WHEN trigger_type = 'keyword' AND specific_media_id IS NOT NULL THEN 'comment'
  
  -- Keywords without media = DMs (global keyword automations)
  WHEN trigger_type = 'keyword' AND specific_media_id IS NULL THEN 'dm'
  
  -- Postbacks are DM-only
  WHEN trigger_type = 'postback' THEN 'dm'
  
  -- Default fallback to comment
  ELSE 'comment'
END;

-- Clean up trigger_type values (remove source from type)
UPDATE automations
SET trigger_type = 'reply_all'
WHERE trigger_type = 'reply_all_comments';

-- Add index for faster filtering by source
CREATE INDEX IF NOT EXISTS idx_automations_trigger_source 
ON automations(trigger_source);

-- Add index for user_id + trigger_source combination (common query)
CREATE INDEX IF NOT EXISTS idx_automations_user_source 
ON automations(user_id, trigger_source);
