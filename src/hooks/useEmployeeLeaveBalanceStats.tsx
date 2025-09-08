
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LeaveBalanceStats {
  vacation_days_total: number;
  vacation_days_used: number;
  vacation_days_remaining: number;
  permission_hours_total: number;
  permission_hours_used: number;
  permission_hours_remaining: number;
  year: number;
  hasBalance: boolean; // Nuovo campo per indicare se esiste un bilancio
}

export const useEmployeeLeaveBalanceStats = (employeeId?: string) => {
  const { profile } = useAuth();
  
  // Determina l'ID dell'utente: se è admin e viene passato employeeId, usa quello, altrimenti usa l'ID corrente
  const targetUserId = profile?.role === 'admin' && employeeId ? employeeId : profile?.id;

  const { data: leaveBalance, isLoading } = useQuery({
    queryKey: ['employee-leave-balance-stats', targetUserId],
    queryFn: async (): Promise<LeaveBalanceStats | null> => {
      if (!targetUserId) return null;

      const currentYear = new Date().getFullYear();

      const { data, error } = await supabase
        .from('employee_leave_balance')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('year', currentYear)
        .maybeSingle();

      if (error) {
        console.error('Errore nel recupero bilancio:', error);
        return null;
      }

      // Se non c'è un bilancio configurato, ritorna null invece di valori zero
      if (!data) {
        console.warn('No leave balance found for user:', targetUserId, 'year:', currentYear);
        return null;
      }

      // Se c'è un bilancio configurato, ritorna i valori effettivi
      // Nuova logica: i rimanenti sono sempre uguali al totale assegnato (reset del sistema)
      return {
        vacation_days_total: data.vacation_days_total,
        vacation_days_used: data.vacation_days_used,
        vacation_days_remaining: Math.max(0, data.vacation_days_total - data.vacation_days_used),
        permission_hours_total: data.permission_hours_total,
        permission_hours_used: data.permission_hours_used,
        permission_hours_remaining: Math.max(0, data.permission_hours_total - data.permission_hours_used),
        year: data.year,
        hasBalance: true,
      };
    },
    enabled: !!targetUserId,
  });

  return {
    leaveBalance,
    isLoading,
  };
};
