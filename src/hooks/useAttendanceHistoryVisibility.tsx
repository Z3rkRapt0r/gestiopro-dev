
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useAttendanceHistoryVisibility() {
  const { profile } = useAuth();
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkVisibility = async () => {
      // Gli admin vedono sempre lo storico
      if (profile?.role === 'admin') {
        setIsHistoryVisible(true);
        setLoading(false);
        return;
      }

      // Per i dipendenti, controlla l'impostazione admin
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('hide_attendance_history_for_employees')
          .maybeSingle();

        if (error) {
          console.error('Errore nel controllo visibilità storico:', error);
          // In caso di errore, mostra lo storico (sicurezza)
          setIsHistoryVisible(true);
        } else if (data) {
          // Se hide_attendance_history_for_employees è true, nascondi lo storico
          setIsHistoryVisible(!data.hide_attendance_history_for_employees);
        } else {
          // Se non ci sono impostazioni, mostra lo storico (default)
          setIsHistoryVisible(true);
        }
      } catch (error) {
        console.error('Errore nel controllo visibilità storico:', error);
        // In caso di errore, mostra lo storico (sicurezza)
        setIsHistoryVisible(true);
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      checkVisibility();
    }
  }, [profile]);

  return { isHistoryVisible, loading };
}
