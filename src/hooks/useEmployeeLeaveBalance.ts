
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface EmployeeLeaveBalance {
  id: string;
  user_id: string;
  year: number;
  vacation_days_total: number;
  vacation_days_used: number;
  permission_hours_total: number;
  permission_hours_used: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    hire_date: string | null;
  };
}

export const useEmployeeLeaveBalance = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: leaveBalances, isLoading } = useQuery({
    queryKey: ['employee-leave-balance'],
    queryFn: async () => {
      console.log('Caricamento bilanci ferie dipendenti...');
      
      let query = supabase
        .from('employee_leave_balance')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            email,
            hire_date,
            tracking_start_type
          )
        `)
        .order('year', { ascending: false });

      // Se non è admin, filtra per utente corrente
      if (profile?.role !== 'admin') {
        query = query.eq('user_id', profile?.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Errore caricamento bilanci:', error);
        throw error;
      }

      console.log('Bilanci caricati:', data);
      return data as unknown as EmployeeLeaveBalance[];
    },
    enabled: !!profile,
  });

  // Calcola i giorni lavorativi considerando il tipo di tracciamento
  const calculateWorkingDaysFromHire = (hireDate: string, year: number, trackingStartType?: string) => {
    const hire = new Date(hireDate);
    const currentYear = new Date().getFullYear();
    
    // Se trackingStartType è 'from_year_start', inizia sempre dal 1° gennaio
    if (trackingStartType === 'from_year_start') {
      return 30; // Giorni pieni per l'anno
    }
    
    // Logica originale per 'from_hire_date'
    // Se l'anno è precedente all'assunzione, 0 giorni
    if (year < hire.getFullYear()) {
      return 0;
    }
    
    // Se è l'anno di assunzione, calcola dal giorno di assunzione
    if (year === hire.getFullYear()) {
      const startOfCalculation = hire;
      const endOfYear = new Date(year, 11, 31); // 31 dicembre
      const endDate = year === currentYear ? new Date() : endOfYear;
      
      // Calcola i mesi lavorati (approssimativo)
      const monthsWorked = Math.max(0, 
        (endDate.getFullYear() - startOfCalculation.getFullYear()) * 12 + 
        endDate.getMonth() - startOfCalculation.getMonth()
      );
      
      // Assumi 2.5 giorni di ferie per mese (30 giorni annui / 12 mesi)
      return Math.floor(monthsWorked * 2.5);
    }
    
    // Se è un anno successivo all'assunzione, diritti pieni (30 giorni)
    return 30;
  };

  const upsertMutation = useMutation({
    mutationFn: async (balanceData: {
      user_id: string;
      year: number;
      vacation_days_total: number;
      permission_hours_total: number;
    }) => {
      console.log('Upsert bilancio:', balanceData);

      const { data, error } = await supabase
        .from('employee_leave_balance')
        .upsert({
          ...balanceData,
          created_by: profile?.id,
        }, {
          onConflict: 'user_id,year'
        })
        .select()
        .single();

      if (error) throw error;
      console.log('Bilancio salvato:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-leave-balance'] });
      toast({
        title: "Bilancio salvato",
        description: "Il bilancio ferie è stato salvato con successo",
      });
    },
    onError: (error: any) => {
      console.error('Errore salvataggio bilancio:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nel salvataggio del bilancio",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Eliminazione bilancio:', id);
      
      const { error } = await supabase
        .from('employee_leave_balance')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-leave-balance'] });
      toast({
        title: "Bilancio eliminato",
        description: "Il bilancio ferie è stato eliminato con successo",
      });
    },
    onError: (error: any) => {
      console.error('Errore eliminazione bilancio:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nell'eliminazione del bilancio",
        variant: "destructive",
      });
    },
  });

  const isAdmin = profile?.role === 'admin';

  return {
    leaveBalances: leaveBalances || [],
    isLoading,
    upsertMutation,
    deleteMutation,
    isAdmin,
    calculateWorkingDaysFromHire,
  };
};
