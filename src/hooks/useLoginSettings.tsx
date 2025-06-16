
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
      
      // Prima, controlliamo tutte le righe nel database
      const { data: allData, error: allError } = await supabase
        .from("dashboard_settings")
        .select("*")
        .order('updated_at', { ascending: false });

      console.log('ALL dashboard_settings rows:', allData);
      console.log('Total rows in dashboard_settings:', allData?.length);

      // Ora carichiamo solo i campi login
      const { data, error } = await supabase
        .from("dashboard_settings")
        .select("login_logo_url, login_company_name, login_primary_color, login_secondary_color, login_background_color")
        .order('updated_at', { ascending: false });

      if (error) {
        console.error("Error loading login settings:", error);
        setSettings(defaultLoginSettings);
        return;
      }

      console.log('All dashboard settings loaded:', data);

      // Trova la prima riga che ha almeno una impostazione login NON di default
      const loginData = data?.find(row => {
        const hasCustomCompanyName = row.login_company_name && row.login_company_name !== "SerramentiCorp";
        const hasCustomLogo = row.login_logo_url;
        const hasCustomPrimaryColor = row.login_primary_color && row.login_primary_color !== '#2563eb';
        const hasCustomSecondaryColor = row.login_secondary_color && row.login_secondary_color !== '#64748b';
        const hasCustomBackgroundColor = row.login_background_color && row.login_background_color !== '#f1f5f9';
        
        const hasAnyCustomSetting = hasCustomCompanyName || hasCustomLogo || hasCustomPrimaryColor || hasCustomSecondaryColor || hasCustomBackgroundColor;
        
        console.log('Checking row:', row);
        console.log('Has custom settings:', {
          hasCustomCompanyName,
          hasCustomLogo, 
          hasCustomPrimaryColor,
          hasCustomSecondaryColor,
          hasCustomBackgroundColor,
          hasAnyCustomSetting
        });
        
        return hasAnyCustomSetting;
      });

      console.log('Found login data:', loginData);

      if (loginData) {
        const newSettings = {
          login_logo_url: loginData.login_logo_url,
          login_company_name: loginData.login_company_name || "SerramentiCorp",
          login_primary_color: loginData.login_primary_color || "#2563eb",
          login_secondary_color: loginData.login_secondary_color || "#64748b",
          login_background_color: loginData.login_background_color || "#f1f5f9",
        };
        console.log('Setting new login settings:', newSettings);
        setSettings(newSettings);
      } else {
        console.log('No custom login settings found, using defaults');
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
