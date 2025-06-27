
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LeaveRequest {
  id: string;
  user_id: string;
  type: 'ferie' | 'permesso' | 'malattia';
  date_from?: string;
  date_to?: string;
  day?: string;
  time_from?: string;
  time_to?: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at?: string;
  updated_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notify_employee?: boolean;
  leave_balance_id?: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export const useLeaveRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leaveRequests, isLoading } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LeaveRequest[];
    },
  });

  const insertMutation = useMutation({
    mutationFn: async (payload: Partial<LeaveRequest>) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert([payload as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast({
        title: "Richiesta inviata",
        description: "La tua richiesta è stata inviata con successo.",
      });
    },
    onError: (error) => {
      console.error('Error inserting leave request:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio della richiesta.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<LeaveRequest> & { id: string }) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update(payload as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast({
        title: "Richiesta aggiornata",
        description: "La richiesta è stata aggiornata con successo.",
      });
    },
    onError: (error) => {
      console.error('Error updating leave request:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento della richiesta.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, admin_note }: { id: string; status: 'approved' | 'rejected'; admin_note?: string }) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({ 
          status, 
          admin_note,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast({
        title: "Stato aggiornato",
        description: "Lo stato della richiesta è stato aggiornato con successo.",
      });
    },
    onError: (error) => {
      console.error('Error updating leave request status:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento dello stato.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (params: string | { id: string; leaveRequest?: LeaveRequest }) => {
      const id = typeof params === 'string' ? params : params.id;
      
      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast({
        title: "Richiesta eliminata",
        description: "La richiesta è stata eliminata con successo.",
      });
    },
    onError: (error) => {
      console.error('Error deleting leave request:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione della richiesta.",
        variant: "destructive",
      });
    },
  });

  // Alias for backward compatibility
  const deleteRequestMutation = deleteMutation;
  const updateRequestMutation = updateMutation;

  return {
    leaveRequests,
    isLoading,
    insertMutation,
    updateMutation,
    updateStatusMutation,
    deleteMutation,
    deleteRequestMutation,
    updateRequestMutation,
  };
};
