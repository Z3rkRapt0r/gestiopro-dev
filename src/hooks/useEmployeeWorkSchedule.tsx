import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmployeeWorkSchedule {
  id: string;
  employee_id: string;
  work_days: string[];
  start_time: string;
  end_time: string;
  tolerance_minutes?: number;
}

export const useEmployeeWorkSchedule = (employeeId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workSchedule, isLoading } = useQuery({
    queryKey: ['employee-work-schedule', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      if (!employeeId) return null;
      console.log(`🔍 [useEmployeeWorkSchedule] Caricamento orari personalizzati per employeeId:`, employeeId);
      
      // Debug: verifica se la tabella esiste e ha dati
      const { data: allSchedules, error: listError } = await supabase
        .from('employee_work_schedules')
        .select('*');
      console.log(`📊 [useEmployeeWorkSchedule] Tutti gli orari personalizzati nel DB:`, allSchedules);
      if (listError) console.error(`❌ [useEmployeeWorkSchedule] Errore nel listare tutti gli orari:`, listError);
      
      const { data, error } = await supabase
        .from('employee_work_schedules')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();
      
      console.log(`🔍 [useEmployeeWorkSchedule] Query specifica per employeeId ${employeeId}:`, { data, error });
      if (error) throw error;
      console.log(`📋 [useEmployeeWorkSchedule] Orari personalizzati caricati:`, data);
      return data as EmployeeWorkSchedule | null;
    },
  });

  const upsertWorkSchedule = useMutation({
    mutationFn: async (newSchedule: Omit<EmployeeWorkSchedule, 'id'>) => {
      const { data, error } = await supabase
        .from('employee_work_schedules')
        .upsert(newSchedule, { onConflict: 'employee_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-work-schedule', employeeId] });
      toast({
        title: 'Orari salvati',
        description: 'Orari di lavoro dipendente aggiornati',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Errore aggiornamento orari dipendente',
        variant: 'destructive',
      });
    },
  });

  return {
    workSchedule,
    isLoading,
    upsertWorkSchedule: upsertWorkSchedule.mutate,
    isUpdating: upsertWorkSchedule.isPending,
  };
}; 