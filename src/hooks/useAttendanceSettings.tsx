
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AttendanceSettings {
  id: string;
  checkout_enabled: boolean;
  company_latitude: number | null;
  company_longitude: number | null;
  attendance_radius_meters: number;
}

export const useAttendanceSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['attendance-settings'],
    queryFn: async () => {
      console.log('Caricamento impostazioni presenze dalla nuova tabella...');
      
      const { data, error } = await supabase
        .from('attendance_settings')
        .select('*')
        .single();

      if (error) {
        console.error('Errore nel caricamento impostazioni presenze:', error);
        throw error;
      }

      console.log('Impostazioni presenze caricate:', data);
      return data as AttendanceSettings;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<AttendanceSettings>) => {
      console.log('Aggiornamento impostazioni presenze:', newSettings);
      
      const { data, error } = await supabase
        .from('attendance_settings')
        .update(newSettings)
        .eq('id', settings?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-settings'] });
      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni delle presenze sono state aggiornate",
      });
    },
    onError: (error: any) => {
      console.error('Errore aggiornamento impostazioni:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nell'aggiornamento delle impostazioni",
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
};
