
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface WorkingDayTrackingRecord {
  id: string;
  user_id: string;
  date: string;
  should_be_tracked: boolean;
  tracking_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const useWorkingDaysTracking = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: workingDaysTracking, isLoading } = useQuery({
    queryKey: ['working-days-tracking'],
    queryFn: async () => {
      console.log('Caricamento working_days_tracking...');
      
      let query = supabase
        .from('working_days_tracking')
        .select('*')
        .order('date', { ascending: false });

      // Se non è admin, filtra per utente corrente
      if (profile?.role !== 'admin') {
        query = query.eq('user_id', profile?.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Errore caricamento working_days_tracking:', error);
        throw error;
      }

      console.log('Working days tracking caricati:', data);
      return data as WorkingDayTrackingRecord[];
    },
    enabled: !!profile,
  });

  // Funzione per verificare se un dipendente dovrebbe essere tracciato in una data specifica
  const shouldTrackEmployeeOnDate = async (userId: string, date: string): Promise<boolean> => {
    const { data, error } = await supabase
      .rpc('should_track_employee_on_date', {
        target_user_id: userId,
        check_date: date
      });

    if (error) {
      console.error('Errore verifica tracking:', error);
      return false;
    }

    return data || false;
  };

  // Funzione per popolare i giorni lavorativi per un utente
  const populateWorkingDaysForUser = useMutation({
    mutationFn: async ({ userId, startDate, endDate }: {
      userId: string;
      startDate?: string;
      endDate?: string;
    }) => {
      const { data, error } = await supabase
        .rpc('populate_working_days_for_user', {
          target_user_id: userId,
          start_date: startDate || null,
          end_date: endDate || null
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['working-days-tracking'] });
      console.log('Giorni lavorativi popolati:', data);
    },
    onError: (error: any) => {
      console.error('Errore popolamento giorni lavorativi:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nel popolamento dei giorni lavorativi",
        variant: "destructive",
      });
    },
  });

  // Funzione helper per verificare se una data è valida per un dipendente
  const isValidDateForEmployee = (employeeId: string, checkDate: string, employees: any[]): { isValid: boolean; message?: string } => {
    const employee = employees?.find(emp => emp.id === employeeId);
    
    if (!employee) {
      return { isValid: false, message: "Dipendente non trovato" };
    }

    if (!employee.hire_date) {
      return { isValid: true }; // Se non ha data di assunzione, permetti tutto
    }

    const selectedDateObj = new Date(checkDate);
    const hireDateObj = new Date(employee.hire_date);

    // Per dipendenti con tracking 'from_hire_date', controlla la data di assunzione
    if (employee.tracking_start_type === 'from_hire_date') {
      if (selectedDateObj < hireDateObj) {
        return { 
          isValid: false, 
          message: `⚠️ Impossibile salvare l'evento: la data selezionata (${selectedDateObj.toLocaleDateString('it-IT')}) è antecedente alla data di assunzione (${hireDateObj.toLocaleDateString('it-IT')}).`
        };
      }
    }

    return { isValid: true };
  };

  return {
    workingDaysTracking,
    isLoading,
    shouldTrackEmployeeOnDate,
    populateWorkingDaysForUser: populateWorkingDaysForUser.mutate,
    isPopulating: populateWorkingDaysForUser.isPending,
    isValidDateForEmployee,
  };
};
