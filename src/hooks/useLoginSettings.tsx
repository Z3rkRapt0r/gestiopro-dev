
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LoginSettings {
  login_logo_url: string | null;
  login_company_name: string;
  login_primary_color: string;
  login_secondary_color: string;
  login_background_color: string;
}

const defaultLoginSettings: LoginSettings = {
  login_logo_url: null,
  login_company_name: "ALM Infissi",
  login_primary_color: "#2563eb",
  login_secondary_color: "#64748b",
  login_background_color: "#f1f5f9",
};

export function useLoginSettings() {
  const [settings, setSettings] = useState<LoginSettings>(defaultLoginSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        console.log('[useLoginSettings] Caricamento impostazioni login...');
        
        // Prende il record più recente ordinando per updated_at
        const { data, error } = await supabase
          .from("dashboard_settings")
          .select("login_logo_url, login_company_name, login_primary_color, login_secondary_color, login_background_color")
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('[useLoginSettings] Risposta database:', { data, error });

        if (error) {
          console.error("[useLoginSettings] Errore durante il caricamento delle impostazioni:", error.message);
          setSettings(defaultLoginSettings);
        } else if (data) {
          // Mappa i dati dal database all'interfaccia LoginSettings
          const loginSettings: LoginSettings = {
            login_logo_url: data.login_logo_url || null,
            login_company_name: data.login_company_name || defaultLoginSettings.login_company_name,
            login_primary_color: data.login_primary_color || defaultLoginSettings.login_primary_color,
            login_secondary_color: data.login_secondary_color || defaultLoginSettings.login_secondary_color,
            login_background_color: data.login_background_color || defaultLoginSettings.login_background_color,
          };
          console.log('[useLoginSettings] Impostazioni caricate:', loginSettings);
          setSettings(loginSettings);
        } else {
          console.log('[useLoginSettings] Nessun dato trovato, uso i default');
          setSettings(defaultLoginSettings);
        }
      } catch (error) {
        console.error("[useLoginSettings] Errore durante il caricamento delle impostazioni:", error);
        setSettings(defaultLoginSettings);
      } finally {
        setLoading(false);
        console.log('[useLoginSettings] Caricamento completato');
      }
    }

    loadSettings();

    const subscription = supabase
      .channel("dashboard_settings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dashboard_settings",
        },
        (payload) => {
          console.log("[useLoginSettings] Modifica ricevuta:", payload);
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
