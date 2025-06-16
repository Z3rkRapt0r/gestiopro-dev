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
      const { data, error } = await supabase
        .from("dashboard_settings")
        .select("*")
        .single(); // Presuppone una singola riga

      if (error) {
        console.error("Errore durante il caricamento delle impostazioni:", error.message);
      } else if (data) {
        setSettings(data as LoginSettings);
      }
      setLoading(false);
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
          if (payload.new) {
            setSettings(payload.new as LoginSettings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return { settings, loading };
}

