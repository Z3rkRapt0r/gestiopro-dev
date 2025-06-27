
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useAttendanceHistoryVisibility = () => {
  const { profile } = useAuth();

  const { data: isHistoryVisible, isLoading } = useQuery({
    queryKey: ['attendance-history-visibility'],
    queryFn: async () => {
      // Se è admin, può sempre vedere lo storico
      if (profile?.role === 'admin') {
        return true;
      }

      // Per i dipendenti, controlla le impostazioni admin
      const { data, error } = await supabase
        .from('admin_settings')
        .select('hide_attendance_history_for_employees')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Errore nel caricamento impostazioni visibilità storico presenze:', error);
        return true; // Default: mostra lo storico in caso di errore
      }

      // Se l'impostazione non esiste o è false, mostra lo storico
      // Se è true, nascondi lo storico ai dipendenti
      return !data?.hide_attendance_history_for_employees;
    },
    enabled: !!profile,
  });

  return {
    isHistoryVisible: isHistoryVisible ?? true,
    isLoading
  };
};
