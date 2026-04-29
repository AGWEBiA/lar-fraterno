
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS push_before boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_start  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_end    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_before boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_start  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_end    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_before boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_start  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_end    boolean NOT NULL DEFAULT false;
