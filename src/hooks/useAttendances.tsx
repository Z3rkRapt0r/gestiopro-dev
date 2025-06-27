import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
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
  is_manual?: boolean;
  is_sick_leave?: boolean;
  notes?: string | null;
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
      
      let automaticAttendances: Attendance[] = [];
      let manualAttendances: Attendance[] = [];

      // Fetch automatic attendances from attendances table
      let automaticQuery = supabase
        .from('attendances')
        .select('*')
        .order('date', { ascending: false });

      // Se non è admin, mostra solo le proprie presenze
      if (profile?.role !== 'admin') {
        automaticQuery = automaticQuery.eq('user_id', user?.id);
      }

      const { data: automaticData, error: automaticError } = await automaticQuery;

      if (automaticError) {
        console.error('Error fetching automatic attendances:', automaticError);
        toast({
          title: "Errore",
          description: "Errore nel caricamento delle presenze automatiche",
          variant: "destructive",
        });
        throw automaticError;
      }

      if (automaticData) {
        automaticAttendances = automaticData.map(att => ({
          ...att,
          is_manual: false,
          is_sick_leave: false,
          notes: null
        }));
      }

      // Fetch manual attendances from unified_attendances table
      let manualQuery = supabase
        .from('unified_attendances')
        .select('*')
        .order('date', { ascending: false });

      // Se non è admin, mostra solo le proprie presenze
      if (profile?.role !== 'admin') {
        manualQuery = manualQuery.eq('user_id', user?.id);
      }

      const { data: manualData, error: manualError } = await manualQuery;

      if (manualError) {
        console.error('Error fetching manual attendances:', manualError);
        // Non bloccare se non riusciamo a prendere le presenze manuali
      } else if (manualData) {
        manualAttendances = manualData.map(att => ({
          id: att.id,
          user_id: att.user_id,
          check_in_time: att.check_in_time,
          check_out_time: att.check_out_time,
          check_in_latitude: null,
          check_in_longitude: null,
          check_out_latitude: null,
          check_out_longitude: null,
          date: att.date,
          created_at: att.created_at,
          updated_at: att.updated_at,
          is_business_trip: att.is_business_trip,
          business_trip_id: null,
          is_manual: att.is_manual,
          is_sick_leave: att.is_sick_leave,
          notes: att.notes
        }));
      }

      // Combine both arrays
      const allAttendances = [...automaticAttendances, ...manualAttendances];

      console.log('Combined attendances:', allAttendances.length);

      // Se è admin, ottieni anche i profili degli utenti
      if (profile?.role === 'admin' && allAttendances.length > 0) {
        const userIds = [...new Set(allAttendances.map(att => att.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          // Non bloccare se non riusciamo a prendere i profili
        }

        // Combina i dati
        const attendancesWithProfiles = allAttendances.map(attendance => ({
          ...attendance,
          profiles: profilesData?.find(profile => profile.id === attendance.user_id) || null
        }));

        console.log('Attendances with profiles:', attendancesWithProfiles);
        
        // Ordina per data (più recente prima)
        return attendancesWithProfiles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }

      // Ordina per data (più recente prima)
      return allAttendances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
    const today = new Date().toISOString().split('T')[0];
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
