-- Abilita RLS sulle tabelle che hanno policy ma RLS disabilitato
-- Questo risolve gli errori di Security Advisor

-- Abilita RLS su notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Abilita RLS su sent_notifications
ALTER TABLE public.sent_notifications ENABLE ROW LEVEL SECURITY;

-- Abilita RLS su cleanup_config
ALTER TABLE public.cleanup_config ENABLE ROW LEVEL SECURITY;

-- Commenti per documentazione
COMMENT ON TABLE public.notifications IS 'Tabella notifiche con RLS abilitato';
COMMENT ON TABLE public.sent_notifications IS 'Tabella notifiche inviate con RLS abilitato';
COMMENT ON TABLE public.cleanup_config IS 'Tabella configurazione pulizia con RLS abilitato';
