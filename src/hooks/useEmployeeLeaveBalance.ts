
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

  const { data: balances, isLoading } = useQuery({
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
            hire_date
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
      return data as EmployeeLeaveBalance[];
    },
    enabled: !!profile,
  });

  // Calcola i giorni lavorativi dal momento dell'assunzione
  const calculateWorkingDaysFromHire = (hireDate: string, year: number) => {
    const hire = new Date(hireDate);
    const currentYear = new Date().getFullYear();
    
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

  const createBalance = useMutation({
    mutationFn: async (balanceData: {
      user_id: string;
      year: number;
      vacation_days_total: number;
      permission_hours_total: number;
    }) => {
      console.log('Creazione nuovo bilancio:', balanceData);

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
      console.log('Bilancio creato:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-leave-balance'] });
      toast({
        title: "Bilancio creato",
        description: "Il bilancio ferie è stato creato con successo",
      });
    },
    onError: (error: any) => {
      console.error('Errore creazione bilancio:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nella creazione del bilancio",
        variant: "destructive",
      });
    },
  });

  const updateBalance = useMutation({
    mutationFn: async (balanceData: {
      id: string;
      vacation_days_total: number;
      permission_hours_total: number;
    }) => {
      console.log('Aggiornamento bilancio:', balanceData);

      const { data, error } = await supabase
        .from('employee_leave_balance')
        .update({
          vacation_days_total: balanceData.vacation_days_total,
          permission_hours_total: balanceData.permission_hours_total,
          updated_at: new Date().toISOString(),
        })
        .eq('id', balanceData.id)
        .select()
        .single();

      if (error) throw error;
      console.log('Bilancio aggiornato:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-leave-balance'] });
      toast({
        title: "Bilancio aggiornato",
        description: "Il bilancio ferie è stato aggiornato con successo",
      });
    },
    onError: (error: any) => {
      console.error('Errore aggiornamento bilancio:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nell'aggiornamento del bilancio",
        variant: "destructive",
      });
    },
  });

  const deleteBalance = useMutation({
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

  return {
    balances,
    isLoading,
    createBalance: createBalance.mutate,
    updateBalance: updateBalance.mutate,
    deleteBalance: deleteBalance.mutate,
    isCreating: createBalance.isPending,
    isUpdating: updateBalance.isPending,
    isDeleting: deleteBalance.isPending,
    calculateWorkingDaysFromHire,
  };
};
