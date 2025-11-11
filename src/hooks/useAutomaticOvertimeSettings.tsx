import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AutomaticOvertimeSettings {
  enable_auto_overtime_checkin: boolean;
  auto_overtime_tolerance_minutes: number;
}

export function useAutomaticOvertimeSettings() {
  const [settings, setSettings] = useState<AutomaticOvertimeSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        console.warn('User not authenticated, using default settings');
        setSettings({
          enable_auto_overtime_checkin: false,
          auto_overtime_tolerance_minutes: 15,
        });
        return;
      }

      const user = session.user;

      // Fetch settings
      const { data, error } = await supabase
        .from('admin_settings')
        .select('enable_auto_overtime_checkin, auto_overtime_tolerance_minutes')
        .eq('admin_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
        // Set default values on error
        setSettings({
          enable_auto_overtime_checkin: false,
          auto_overtime_tolerance_minutes: 15,
        });
        return;
      }

      if (data) {
        setSettings({
          enable_auto_overtime_checkin: data.enable_auto_overtime_checkin ?? false,
          auto_overtime_tolerance_minutes: data.auto_overtime_tolerance_minutes ?? 15,
        });
      } else {
        // Set default values if no settings exist
        setSettings({
          enable_auto_overtime_checkin: false,
          auto_overtime_tolerance_minutes: 15,
        });
      }
    } catch (error) {
      console.error('Error fetching automatic overtime settings:', error);
      // Set default values instead of showing error
      setSettings({
        enable_auto_overtime_checkin: false,
        auto_overtime_tolerance_minutes: 15,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<AutomaticOvertimeSettings>) => {
    try {
      setIsUpdating(true);

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        throw new Error('User not authenticated');
      }

      const user = session.user;

      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from('admin_settings')
        .select('admin_id')
        .eq('admin_id', user.id)
        .maybeSingle();

      if (existingSettings) {
        // Update existing settings
        const { error } = await supabase
          .from('admin_settings')
          .update({
            enable_auto_overtime_checkin: newSettings.enable_auto_overtime_checkin,
            auto_overtime_tolerance_minutes: newSettings.auto_overtime_tolerance_minutes,
            updated_at: new Date().toISOString(),
          })
          .eq('admin_id', user.id);

        if (error) throw error;
      } else {
        // Settings don't exist - show error
        throw new Error('Admin settings record not found. Please contact support.');
      }

      // Update local state
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);

      toast({
        title: 'Successo',
        description: 'Impostazioni straordinari automatici aggiornate con successo',
      });

      return true;
    } catch (error) {
      console.error('Error updating automatic overtime settings:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare le impostazioni degli straordinari automatici',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    settings,
    isLoading,
    isUpdating,
    updateSettings,
    refetch: fetchSettings,
  };
}

