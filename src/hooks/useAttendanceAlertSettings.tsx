import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface AttendanceAlertSettings {
  attendance_alert_enabled: boolean;
  attendance_alert_delay_minutes: number;
}

export const useAttendanceAlertSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AttendanceAlertSettings | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
  }, [user?.id]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('attendance_alert_enabled, attendance_alert_delay_minutes')
        .eq('admin_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading attendance alert settings:', error);
        return;
      }

      if (data) {
        setSettings({
          attendance_alert_enabled: data.attendance_alert_enabled ?? false,
          attendance_alert_delay_minutes: data.attendance_alert_delay_minutes ?? 30,
        });
      } else {
        // Default settings
        setSettings({
          attendance_alert_enabled: false,
          attendance_alert_delay_minutes: 30,
        });
      }
    } catch (error) {
      console.error('Error loading attendance alert settings:', error);
    }
  };

  const updateSettings = async (newSettings: AttendanceAlertSettings) => {
    setIsUpdating(true);
    try {
      console.log('Updating attendance alert settings:', newSettings);
      
      // Prima verifica se esiste già un record per questo admin
      const { data: existingRecord, error: selectError } = await supabase
        .from('admin_settings')
        .select('admin_id')
        .eq('admin_id', user?.id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Error checking existing admin settings:', selectError);
        throw new Error(`Database error: ${selectError.message}`);
      }

      let result;
      if (existingRecord) {
        // Update existing record
        result = await supabase
          .from('admin_settings')
          .update({
            attendance_alert_enabled: newSettings.attendance_alert_enabled,
            attendance_alert_delay_minutes: newSettings.attendance_alert_delay_minutes,
          })
          .eq('admin_id', user?.id);
      } else {
        // Insert new record
        result = await supabase
          .from('admin_settings')
          .insert({
            admin_id: user?.id,
            attendance_alert_enabled: newSettings.attendance_alert_enabled,
            attendance_alert_delay_minutes: newSettings.attendance_alert_delay_minutes,
          });
      }

      if (result.error) {
        console.error('Database operation error:', result.error);
        throw new Error(`Failed to save settings: ${result.error.message}`);
      }

      setSettings(newSettings);
      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni di controllo entrate sono state aggiornate con successo.",
      });
    } catch (error: any) {
      console.error('Error updating attendance alert settings:', error);
      const errorMessage = error.message || 'Errore sconosciuto';
      toast({
        title: "Errore",
        description: `Impossibile salvare le impostazioni: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    settings,
    updateSettings,
    isUpdating,
  };
};
