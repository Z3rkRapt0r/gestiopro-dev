
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardSettings {
  company_name: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

const defaultSettings: DashboardSettings = {
  company_name: "A.L.M Infissi",
  logo_url: null,
  primary_color: "#007bff",
  secondary_color: "#6c757d",
};

export function useDashboardSettings() {
  const [settings, setSettings] = useState<DashboardSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Carica le impostazioni da qualsiasi admin (prendiamo la prima trovata)
      const { data, error } = await supabase
        .from("dashboard_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error loading dashboard settings:", error);
        setSettings(defaultSettings);
        return;
      }

      if (data) {
        setSettings({
          company_name: data.company_name,
          logo_url: data.logo_url,
          primary_color: data.primary_color || "#007bff",
          secondary_color: data.secondary_color || "#6c757d",
        });
      } else {
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Error loading dashboard settings:", error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const applyCustomStyles = () => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', settings.primary_color);
    root.style.setProperty('--secondary-color', settings.secondary_color);
  };

  useEffect(() => {
    if (!loading) {
      applyCustomStyles();
    }
  }, [settings, loading]);

  return {
    settings,
    loading,
    refreshSettings: loadSettings,
  };
}
