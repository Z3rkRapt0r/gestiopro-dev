
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WorkSchedule {
  id: string;
  start_time: string;
  end_time: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  tolerance_minutes: number;
}

export const useWorkSchedules = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workSchedule, isLoading } = useQuery({
    queryKey: ['work-schedules'],
    queryFn: async () => {
      console.log('Caricamento orari di lavoro...');
      
      const { data, error } = await supabase
        .from('work_schedules')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Errore nel caricamento orari di lavoro:', error);
        throw error;
      }

      console.log('Orari di lavoro caricati:', data);
      return data as WorkSchedule | null;
    },
  });

  const updateWorkSchedule = useMutation({
    mutationFn: async (newSchedule: Partial<WorkSchedule>) => {
      console.log('Aggiornamento orari di lavoro:', newSchedule);
      
      if (workSchedule?.id) {
        // Update existing record
        const { data, error } = await supabase
          .from('work_schedules')
          .update(newSchedule)
          .eq('id', workSchedule.id)
          .select()
          .single();

        if (error) throw error;
        console.log('Orari aggiornati:', data);
        return data;
      } else {
        // Insert new record if none exists
        const { data, error } = await supabase
          .from('work_schedules')
          .insert(newSchedule)
          .select()
          .single();

        if (error) throw error;
        console.log('Nuovi orari inseriti:', data);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-schedules'] });
      toast({
        title: "Orari salvati",
        description: "Gli orari di lavoro sono stati aggiornati",
      });
    },
    onError: (error: any) => {
      console.error('Errore aggiornamento orari:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nell'aggiornamento degli orari",
        variant: "destructive",
      });
    },
  });

  return {
    workSchedule,
    isLoading,
    updateWorkSchedule: updateWorkSchedule.mutate,
    isUpdating: updateWorkSchedule.isPending,
  };
};
