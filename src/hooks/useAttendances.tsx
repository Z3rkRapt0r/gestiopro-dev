
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { useAttendanceOperations } from './useAttendanceOperations';
import { useAttendanceSettings } from './useAttendanceSettings';

export interface Attendance {
  id: string;
  user_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  date: string;
  created_at: string;
  updated_at: string;
  is_business_trip: boolean | null;
  business_trip_id: string | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export const useAttendances = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const attendanceOperations = useAttendanceOperations();
  const { settings: adminSettings } = useAttendanceSettings();

  const { data: attendances, isLoading } = useQuery({
    queryKey: ['attendances'],
    queryFn: async () => {
      console.log('Fetching attendances...');
      
      let query = supabase
        .from('attendances')
        .select('*')
        .order('date', { ascending: false });

      // Se non è admin, mostra solo le proprie presenze
      if (profile?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data: attendanceData, error: attendanceError } = await query;

      if (attendanceError) {
        console.error('Error fetching attendances:', attendanceError);
        toast({
          title: "Errore",
          description: "Errore nel caricamento delle presenze",
          variant: "destructive",
        });
        throw attendanceError;
      }

      console.log('Attendances data:', attendanceData);

      // Se è admin, ottieni anche i profili degli utenti
      if (profile?.role === 'admin' && attendanceData && attendanceData.length > 0) {
        const userIds = [...new Set(attendanceData.map(att => att.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          // Non bloccare se non riusciamo a prendere i profili
        }

        // Combina i dati
        const attendancesWithProfiles = attendanceData.map(attendance => ({
          ...attendance,
          profiles: profilesData?.find(profile => profile.id === attendance.user_id) || null
        }));

        console.log('Attendances with profiles:', attendancesWithProfiles);
        return attendancesWithProfiles as Attendance[];
      }

      return attendanceData as Attendance[];
    },
    enabled: !!user && !!profile,
  });

  const deleteAttendance = useMutation({
    mutationFn: async (attendanceId: string) => {
      console.log('Tentativo di eliminazione presenza con ID:', attendanceId);
      console.log('Utente corrente:', { id: user?.id, role: profile?.role });
      
      const { error } = await supabase
        .from('attendances')
        .delete()
        .eq('id', attendanceId);

      if (error) {
        console.error('Errore eliminazione presenza:', error);
        throw error;
      }
      
      console.log('Presenza eliminata con successo');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      queryClient.invalidateQueries({ queryKey: ['manual-attendances'] });
      toast({
        title: "Presenza eliminata",
        description: "La presenza è stata eliminata con successo",
      });
    },
    onError: (error: any) => {
      console.error('Delete attendance error:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nell'eliminazione della presenza",
        variant: "destructive",
      });
    },
  });

  const getTodayAttendance = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return attendances?.find(att => att.date === today && att.user_id === user?.id);
  };

  return {
    attendances,
    isLoading,
    checkIn: attendanceOperations.checkIn,
    checkOut: attendanceOperations.checkOut,
    deleteAttendance: deleteAttendance.mutate,
    isCheckingIn: attendanceOperations.isCheckingIn,
    isCheckingOut: attendanceOperations.isCheckingOut,
    isDeleting: deleteAttendance.isPending,
    getTodayAttendance,
    adminSettings,
  };
};
