
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
  login_company_name: "SerramentiCorp",
  login_primary_color: "#2563eb",
  login_secondary_color: "#64748b",
  login_background_color: "#f1f5f9",
};

export function useLoginSettings() {
  const [settings, setSettings] = useState<LoginSettings>(defaultLoginSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    
    // Setup real-time subscription per aggiornamenti automatici
    const subscription = supabase
      .channel('dashboard_settings_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'dashboard_settings' 
        }, 
        () => {
          console.log('Dashboard settings changed, reloading...');
          loadSettings();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadSettings = async () => {
    try {
      console.log('Loading login settings...');
      // Carica tutte le impostazioni login disponibili e prendi la prima con valori non nulli
      const { data, error } = await supabase
        .from("dashboard_settings")
        .select("login_logo_url, login_company_name, login_primary_color, login_secondary_color, login_background_color")
        .not('login_company_name', 'is', null)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading login settings:", error);
        setSettings(defaultLoginSettings);
        return;
      }

      console.log('Login settings loaded:', data);

      if (data) {
        const newSettings = {
          login_logo_url: data.login_logo_url,
          login_company_name: data.login_company_name || "SerramentiCorp",
          login_primary_color: data.login_primary_color || "#2563eb",
          login_secondary_color: data.login_secondary_color || "#64748b",
          login_background_color: data.login_background_color || "#f1f5f9",
        };
        console.log('Setting new login settings:', newSettings);
        setSettings(newSettings);
      } else {
        console.log('No login settings found, using defaults');
        setSettings(defaultLoginSettings);
      }
    } catch (error) {
      console.error("Error loading login settings:", error);
      setSettings(defaultLoginSettings);
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    loading,
    refreshSettings: loadSettings,
  };
}
