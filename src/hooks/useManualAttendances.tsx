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
      const { data: attendanceData, error } = await supabase
        .from('manual_attendances')
        .select('*')
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
    }) => {
      console.log('Creazione presenza manuale con dati:', attendanceData);
      
      // Inserisci nella tabella manual_attendances
      const { data: manualData, error: manualError } = await supabase
        .from('manual_attendances')
        .insert({
          ...attendanceData,
          created_by: user?.id,
        })
        .select()
        .single();

      if (manualError) {
        console.error('Errore inserimento manual_attendances:', manualError);
        throw manualError;
      }

      // Sincronizza anche nella tabella attendances per uniformità con i dati esistenti
      const { data: attendanceRecord, error: attendanceError } = await supabase
        .from('attendances')
        .upsert({
          user_id: attendanceData.user_id,
          date: attendanceData.date,
          check_in_time: attendanceData.check_in_time,
          check_out_time: attendanceData.check_out_time,
          check_in_latitude: null,
          check_in_longitude: null,
          check_out_latitude: null,
          check_out_longitude: null,
          is_business_trip: false,
        }, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (attendanceError) {
        console.warn('Warning: Could not sync to attendances table:', attendanceError);
      } else {
        console.log('Presenza sincronizzata nella tabella attendances:', attendanceRecord);
      }

      return manualData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      toast({
        title: "Presenza aggiunta",
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
        .from('manual_attendances')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-attendances'] });
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
      const { error } = await supabase
        .from('manual_attendances')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-attendances'] });
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
  };
};
