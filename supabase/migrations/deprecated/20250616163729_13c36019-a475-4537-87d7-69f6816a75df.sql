
-- Modifica la tabella email_templates esistente per supportare personalizzazioni complete
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS template_type text NOT NULL DEFAULT 'generale',
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#007bff',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#6c757d',
ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS text_color text DEFAULT '#333333',
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS logo_alignment text DEFAULT 'center',
ADD COLUMN IF NOT EXISTS logo_size text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS footer_text text DEFAULT '© A.L.M Infissi - Tutti i diritti riservati. P.Iva 06365120820',
ADD COLUMN IF NOT EXISTS footer_color text DEFAULT '#888888',
ADD COLUMN IF NOT EXISTS header_alignment text DEFAULT 'center',
ADD COLUMN IF NOT EXISTS body_alignment text DEFAULT 'left',
ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'Arial, sans-serif',
ADD COLUMN IF NOT EXISTS font_size text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS button_color text DEFAULT '#007bff',
ADD COLUMN IF NOT EXISTS button_text_color text DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS border_radius text DEFAULT '6px';

-- Rimuovi la colonna topic esistente se presente e sostituiscila con template_type
ALTER TABLE public.email_templates DROP COLUMN IF EXISTS topic;

-- Aggiungi un vincolo per i tipi di template supportati
ALTER TABLE public.email_templates 
ADD CONSTRAINT check_template_type 
CHECK (template_type IN ('documenti', 'notifiche', 'approvazioni', 'generale'));

-- Aggiungi un vincolo per l'allineamento del logo
ALTER TABLE public.email_templates 
ADD CONSTRAINT check_logo_alignment 
CHECK (logo_alignment IN ('left', 'center', 'right'));

-- Aggiungi un vincolo per la dimensione del logo
ALTER TABLE public.email_templates 
ADD CONSTRAINT check_logo_size 
CHECK (logo_size IN ('small', 'medium', 'large'));

-- Aggiungi un vincolo per l'allineamento dell'header
ALTER TABLE public.email_templates 
ADD CONSTRAINT check_header_alignment 
CHECK (header_alignment IN ('left', 'center', 'right'));

-- Aggiungi un vincolo per l'allineamento del body
ALTER TABLE public.email_templates 
ADD CONSTRAINT check_body_alignment 
CHECK (body_alignment IN ('left', 'center', 'right', 'justify'));

-- Aggiungi un vincolo per la dimensione del font
ALTER TABLE public.email_templates 
ADD CONSTRAINT check_font_size 
CHECK (font_size IN ('small', 'medium', 'large'));

-- Crea un indice per migliorare le performance delle query per template_type e admin_id
CREATE INDEX IF NOT EXISTS idx_email_templates_admin_type 
ON public.email_templates(admin_id, template_type);

-- Aggiorna il trigger per updated_at se non esiste già
DROP TRIGGER IF EXISTS handle_updated_at ON public.email_templates;
CREATE TRIGGER handle_updated_at 
BEFORE UPDATE ON public.email_templates
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
