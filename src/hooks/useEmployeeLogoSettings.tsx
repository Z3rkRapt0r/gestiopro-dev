
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
    
    // Setup real-time subscription per aggiornamenti automatici
    const subscription = supabase
      .channel('employee_logo_settings_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'employee_logo_settings' 
        }, 
        () => {
          console.log('Employee logo settings changed, reloading...');
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
      console.log('Loading employee logo settings from new table...');
      
      // Carica le impostazioni dalla nuova tabella employee_logo_settings
      // ordinando per updated_at per prendere la più recente
      const { data, error } = await supabase
        .from("employee_logo_settings")
        .select("employee_default_logo_url, employee_logo_enabled")
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error loading employee logo settings:", error);
        setSettings(defaultEmployeeLogoSettings);
        return;
      }

      console.log('Employee logo settings loaded from new table:', data);

      if (data) {
        const newSettings = {
          employee_default_logo_url: data.employee_default_logo_url,
          employee_logo_enabled: data.employee_logo_enabled ?? true,
        };
        console.log('Setting new employee logo settings:', newSettings);
        setSettings(newSettings);
      } else {
        console.log('No employee logo settings found in new table, using defaults');
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
