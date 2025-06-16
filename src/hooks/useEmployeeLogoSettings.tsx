
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EmployeeLogoSettings {
  employee_default_logo_url: string | null;
  employee_logo_enabled: boolean;
}

const defaultEmployeeLogoSettings: EmployeeLogoSettings = {
  employee_default_logo_url: null,
  employee_logo_enabled: true,
};

export function useEmployeeLogoSettings() {
  const [settings, setSettings] = useState<EmployeeLogoSettings>(defaultEmployeeLogoSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Carica le impostazioni logo dipendenti da qualsiasi admin (prendiamo la prima trovata)
      const { data, error } = await supabase
        .from("dashboard_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error loading employee logo settings:", error);
        setSettings(defaultEmployeeLogoSettings);
        return;
      }

      if (data) {
        setSettings({
          employee_default_logo_url: data.employee_default_logo_url,
          employee_logo_enabled: data.employee_logo_enabled ?? true,
        });
      } else {
        setSettings(defaultEmployeeLogoSettings);
      }
    } catch (error) {
      console.error("Error loading employee logo settings:", error);
      setSettings(defaultEmployeeLogoSettings);
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
