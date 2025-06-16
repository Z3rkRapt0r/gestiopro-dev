
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
        // Prende il record più recente ordinando per updated_at
        const { data, error } = await supabase
          .from("dashboard_settings")
          .select("login_logo_url, login_company_name, login_primary_color, login_secondary_color, login_background_color")
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Errore durante il caricamento delle impostazioni:", error.message);
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
          setSettings(loginSettings);
        } else {
          // Nessun dato trovato, usa i default
          setSettings(defaultLoginSettings);
        }
      } catch (error) {
        console.error("Errore durante il caricamento delle impostazioni:", error);
        setSettings(defaultLoginSettings);
      } finally {
        setLoading(false);
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
          console.log("Modifica ricevuta:", payload);
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
