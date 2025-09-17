
ALTER TABLE public.admin_settings
ADD CONSTRAINT admin_settings_admin_id_unique UNIQUE (admin_id);
