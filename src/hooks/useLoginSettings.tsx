
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LoginSettings {
  logo_url: string | null;
  company_name: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
}

const defaultLoginSettings: LoginSettings = {
  logo_url: null,
  company_name: "ALM Infissi",
  primary_color: "#2563eb",
  secondary_color: "#64748b",
  background_color: "#f1f5f9",
};

export function useLoginSettings() {
  const [settings, setSettings] = useState<LoginSettings>(defaultLoginSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        console.log('[useLoginSettings] Caricamento impostazioni dalla tabella login_settings...');
        
        // Carica le impostazioni dalla nuova tabella login_settings
        // ordinando per updated_at per prendere la più recente
        const { data, error } = await supabase
          .from("login_settings")
          .select("*")
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('[useLoginSettings] Risposta database login_settings:', { data, error });

        if (error) {
          console.error("[useLoginSettings] Errore durante il caricamento delle impostazioni:", error.message);
          setSettings(defaultLoginSettings);
        } else if (data) {
          // Usa i dati dal database se presenti, altrimenti usa i default
          const loginSettings: LoginSettings = {
            logo_url: data.logo_url || null,
            company_name: data.company_name || defaultLoginSettings.company_name,
            primary_color: data.primary_color || defaultLoginSettings.primary_color,
            secondary_color: data.secondary_color || defaultLoginSettings.secondary_color,
            background_color: data.background_color || defaultLoginSettings.background_color,
          };
          
          console.log('[useLoginSettings] Impostazioni mappate dalla tabella login_settings:', loginSettings);
          setSettings(loginSettings);
        } else {
          console.log('[useLoginSettings] Nessun dato trovato nella tabella login_settings, uso i default');
          setSettings(defaultLoginSettings);
        }
      } catch (error) {
        console.error("[useLoginSettings] Errore durante il caricamento delle impostazioni:", error);
        setSettings(defaultLoginSettings);
      } finally {
        setLoading(false);
        console.log('[useLoginSettings] Caricamento completato, settings finali:', settings);
      }
    }

    loadSettings();

    // Imposta la subscription per gli aggiornamenti real-time sulla tabella login_settings
    const subscription = supabase
      .channel("login_settings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "login_settings",
        },
        (payload) => {
          console.log("[useLoginSettings] Modifica ricevuta dalla tabella login_settings:", payload);
          loadSettings(); // Ricarica le impostazioni quando cambiano
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return { settings, loading };
}
