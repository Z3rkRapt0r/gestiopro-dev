import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmployeeWorkSchedule {
  id: string;
  employee_id: string;
  work_days: string[] | null; // Mantenuto per compatibilità temporanea
  start_time: string;
  end_time: string;
  tolerance_minutes?: number;
  // Nuove colonne booleane
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
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
      const { data, error } = await supabase
        .from('employee_work_schedules')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();
      if (error) throw error;
      console.log(`📋 [useEmployeeWorkSchedule] Orari personalizzati caricati:`, data);
      return data as EmployeeWorkSchedule | null;
    },
  });

  const upsertWorkSchedule = useMutation({
    mutationFn: async (newSchedule: Omit<EmployeeWorkSchedule, 'id'>) => {
      // Rimuovi work_days dal payload per evitare errori
      const { work_days, ...scheduleWithoutWorkDays } = newSchedule;
      const { data, error } = await supabase
        .from('employee_work_schedules')
        .upsert(scheduleWithoutWorkDays, { onConflict: 'employee_id' })
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