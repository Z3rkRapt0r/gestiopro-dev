
ALTER TABLE public.email_templates
ADD COLUMN topic TEXT NOT NULL DEFAULT 'generale';

-- L’argomento "generale" sarà il valore predefinito.
-- In seguito si possono usare valori come: "documenti", "assenze", "promemoria", ecc. 
