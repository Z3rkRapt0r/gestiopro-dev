
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface ManualAttendance {
  id: string;
  user_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  notes: string | null;
  is_sick_leave: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export const useManualAttendances = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: manualAttendances, isLoading } = useQuery({
    queryKey: ['manual-attendances'],
    queryFn: async () => {
      console.log('Caricamento presenze manuali da unified_attendances...');
      
      const { data: attendanceData, error } = await supabase
        .from('unified_attendances')
        .select('*')
        .eq('is_manual', true)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching manual attendances:', error);
        throw error;
      }

      if (attendanceData && attendanceData.length > 0) {
        const userIds = [...new Set(attendanceData.map(att => att.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        const attendancesWithProfiles = attendanceData.map(attendance => ({
          ...attendance,
          profiles: profilesData?.find(profile => profile.id === attendance.user_id) || null
        }));

        console.log('Presenze manuali caricate:', attendancesWithProfiles);
        return attendancesWithProfiles as ManualAttendance[];
      }

      return attendanceData as ManualAttendance[];
    },
    enabled: !!user,
  });

  const createManualAttendance = useMutation({
    mutationFn: async (attendanceData: {
      user_id: string;
      date: string;
      check_in_time: string | null;
      check_out_time: string | null;
      notes: string | null;
      is_sick_leave?: boolean;
    }) => {
      console.log('Creazione presenza manuale con dati:', attendanceData);
      
      const { data: unifiedData, error: unifiedError } = await supabase
        .from('unified_attendances')
        .upsert({
          ...attendanceData,
          is_manual: true,
          is_business_trip: false,
          is_sick_leave: attendanceData.is_sick_leave || false,
          created_by: user?.id,
        }, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (unifiedError) {
        console.error('Errore inserimento/aggiornamento unified_attendances:', unifiedError);
        throw unifiedError;
      }

      console.log('Presenza manuale salvata:', unifiedData);
      return unifiedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      toast({
        title: "Presenza salvata",
        description: "La presenza manuale è stata registrata con successo",
      });
    },
    onError: (error: any) => {
      console.error('Create manual attendance error:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nella registrazione della presenza",
        variant: "destructive",
      });
    },
  });

  const updateManualAttendance = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<ManualAttendance> & { id: string }) => {
      const { data, error } = await supabase
        .from('unified_attendances')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      toast({
        title: "Presenza aggiornata",
        description: "La presenza è stata modificata",
      });
    },
    onError: (error: any) => {
      console.error('Update manual attendance error:', error);
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento della presenza",
        variant: "destructive",
      });
    },
  });

  const deleteManualAttendance = useMutation({
    mutationFn: async (id: string) => {
      console.log('Eliminazione presenza manuale con ID:', id);
      
      const { error } = await supabase
        .from('unified_attendances')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Errore eliminazione presenza:', error);
        throw error;
      }
      
      console.log('Presenza manuale eliminata con successo');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      toast({
        title: "Presenza eliminata",
        description: "La presenza è stata rimossa",
      });
    },
    onError: (error: any) => {
      console.error('Delete manual attendance error:', error);
      toast({
        title: "Errore",
        description: "Errore nell'eliminazione della presenza",
        variant: "destructive",
      });
    },
  });

  return {
    manualAttendances,
    isLoading,
    createManualAttendance: createManualAttendance.mutate,
    isCreating: createManualAttendance.isPending,
    deleteManualAttendance: deleteManualAttendance.mutate,
    isDeleting: deleteManualAttendance.isPending,
  };
};
