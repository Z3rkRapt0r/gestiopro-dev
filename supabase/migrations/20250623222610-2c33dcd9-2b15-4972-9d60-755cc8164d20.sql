
-- Aggiungi colonne per tutte le impostazioni Brevo alla tabella admin_settings
ALTER TABLE public.admin_settings
ADD COLUMN sender_name TEXT,
ADD COLUMN sender_email TEXT,
ADD COLUMN reply_to TEXT,
ADD COLUMN email_signature TEXT,
ADD COLUMN enable_notifications BOOLEAN DEFAULT true,
ADD COLUMN enable_document_notifications BOOLEAN DEFAULT true,
ADD COLUMN enable_attendance_notifications BOOLEAN DEFAULT true,
ADD COLUMN enable_leave_notifications BOOLEAN DEFAULT true,
ADD COLUMN enable_welcome_emails BOOLEAN DEFAULT true,
ADD COLUMN track_opens BOOLEAN DEFAULT true,
ADD COLUMN track_clicks BOOLEAN DEFAULT true,
ADD COLUMN auto_retry BOOLEAN DEFAULT true,
ADD COLUMN max_retries INTEGER DEFAULT 3;
