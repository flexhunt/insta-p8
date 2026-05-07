ALTER TABLE public.users ADD COLUMN IF NOT EXISTS groq_auto_reply_enabled boolean DEFAULT false;
