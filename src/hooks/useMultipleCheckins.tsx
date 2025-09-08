import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export interface MultipleCheckin {
  id: string;
  employee_id: string;
  date: string;
  checkin_time: string;
  checkout_time: string | null;
  is_second_checkin: boolean;
  permission_id: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  leave_requests?: {
    id: string;
    type: string;
    time_from: string | null;
    time_to: string | null;
  } | null;
}

export const useMultipleCheckins = (employeeId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query per ottenere i check-in multipli
  const { data: checkins, isLoading, error } = useQuery({
    queryKey: ['multiple-checkins', employeeId || user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('multiple_checkins')
        .select(`
          *,
          profiles (
            id,
            first_name,
            last_name,
            email
          ),
          leave_requests (
            id,
            type,
            time_from,
            time_to
          )
        `)
        .eq('employee_id', employeeId || user?.id)
        .order('date', { ascending: false })
        .order('checkin_time', { ascending: true });

      if (error) {
        console.error('Errore nel caricamento dei check-in multipli:', error);
        throw error;
      }

      return data as MultipleCheckin[];
    },
    enabled: !!(employeeId || user?.id),
  });

  // Query per ottenere i check-in di oggi
  const { data: todayCheckins } = useQuery({
    queryKey: ['multiple-checkins-today', employeeId || user?.id],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('multiple_checkins')
        .select(`
          *,
          profiles (
            id,
            first_name,
            last_name,
            email
          ),
          leave_requests (
            id,
            type,
            time_from,
            time_to
          )
        `)
        .eq('employee_id', employeeId || user?.id)
        .eq('date', today)
        .order('checkin_time', { ascending: true });

      if (error) {
        console.error('Errore nel caricamento dei check-in di oggi:', error);
        throw error;
      }

      return data as MultipleCheckin[];
    },
    enabled: !!(employeeId || user?.id),
  });

  // Mutation per creare un nuovo check-in
  const createCheckinMutation = useMutation({
    mutationFn: async (checkinData: {
      employee_id: string;
      date: string;
      checkin_time: string;
      checkout_time?: string | null;
      is_second_checkin?: boolean;
      permission_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('multiple_checkins')
        .insert(checkinData)
        .select()
        .single();

      if (error) {
        console.error('Errore nella creazione del check-in:', error);
        throw error;
      }

      return data as MultipleCheckin;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multiple-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['multiple-checkins-today'] });
      toast({
        title: "Check-in Registrato",
        description: "Il check-in è stato registrato con successo",
      });
    },
    onError: (error: any) => {
      console.error('Errore nella creazione del check-in:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la registrazione del check-in",
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare un check-in
  const updateCheckinMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MultipleCheckin> }) => {
      const { data, error } = await supabase
        .from('multiple_checkins')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Errore nell\'aggiornamento del check-in:', error);
        throw error;
      }

      return data as MultipleCheckin;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multiple-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['multiple-checkins-today'] });
      toast({
        title: "Check-in Aggiornato",
        description: "Il check-in è stato aggiornato con successo",
      });
    },
    onError: (error: any) => {
      console.error('Errore nell\'aggiornamento del check-in:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento del check-in",
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare un check-in
  const deleteCheckinMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('multiple_checkins')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Errore nell\'eliminazione del check-in:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multiple-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['multiple-checkins-today'] });
      toast({
        title: "Check-in Eliminato",
        description: "Il check-in è stato eliminato con successo",
      });
    },
    onError: (error: any) => {
      console.error('Errore nell\'eliminazione del check-in:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione del check-in",
        variant: "destructive",
      });
    },
  });

  return {
    checkins: checkins || [],
    todayCheckins: todayCheckins || [],
    isLoading,
    error,
    createCheckin: createCheckinMutation.mutate,
    updateCheckin: updateCheckinMutation.mutate,
    deleteCheckin: deleteCheckinMutation.mutate,
    isCreating: createCheckinMutation.isPending,
    isUpdating: updateCheckinMutation.isPending,
    isDeleting: deleteCheckinMutation.isPending,
  };
};

