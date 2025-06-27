
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface UnifiedAttendance {
  id: string;
  user_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  is_business_trip: boolean;
  is_manual: boolean;
  is_sick_leave: boolean;
  notes?: string | null;
  created_at: string;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export const useUnifiedAttendances = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: attendances, isLoading } = useQuery({
    queryKey: ['unified-attendances'],
    queryFn: async () => {
      console.log('Caricamento presenze unificate dalla tabella unified_attendances...');
      
      let query = supabase
        .from('unified_attendances')
        .select('*')
        .order('date', { ascending: false });

      // Se non è admin, filtra per utente corrente
      if (profile?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data: attendanceData, error } = await query;

      if (error) {
        console.error('Errore caricamento unified_attendances:', error);
        throw error;
      }

      let allAttendances = attendanceData || [];

      // Se è admin, ottieni i profili degli utenti
      if (profile?.role === 'admin' && allAttendances.length > 0) {
        const userIds = [...new Set(allAttendances.map(att => att.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Errore caricamento profili:', profilesError);
        }

        // Mappa i profili agli attendance records
        allAttendances = allAttendances.map(attendance => ({
          ...attendance,
          profiles: profilesData?.find(profile => profile.id === attendance.user_id) || null
        }));
      }

      console.log('Presenze unificate caricate:', allAttendances);
      return allAttendances as UnifiedAttendance[];
    },
    enabled: !!user && !!profile,
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
      console.log('SALVATAGGIO PRESENZA - Dati ricevuti:', attendanceData);
      console.log('Data da salvare (DEVE rimanere invariata):', attendanceData.date);
      
      // Inseriamo i dati ESATTAMENTE come ricevuti - ZERO conversioni
      const dataToInsert = {
        user_id: attendanceData.user_id,
        date: attendanceData.date, // STRINGA ESATTA: YYYY-MM-DD
        check_in_time: attendanceData.check_in_time, // STRINGA ESATTA: HH:MM
        check_out_time: attendanceData.check_out_time, // STRINGA ESATTA: HH:MM
        notes: attendanceData.notes,
        is_manual: true,
        is_business_trip: false,
        is_sick_leave: attendanceData.is_sick_leave || false,
        created_by: user?.id,
      };

      console.log('Dati che verranno inseriti nel database:', dataToInsert);

      const { data, error } = await supabase
        .from('unified_attendances')
        .upsert(dataToInsert, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (error) {
        console.error('ERRORE SUPABASE durante il salvataggio:', error);
        throw error;
      }

      console.log('SUCCESSO - Presenza salvata nel database:', data);
      console.log('Data salvata nel database:', data.date);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      console.log('SUCCESS CALLBACK - Presenza salvata con data:', data.date);
      toast({
        title: "Presenza salvata",
        description: data.is_sick_leave ? "La malattia è stata registrata con successo" : "La presenza manuale è stata registrata con successo",
      });
    },
    onError: (error: any) => {
      console.error('Errore creazione presenza manuale:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nella registrazione della presenza",
        variant: "destructive",
      });
    },
  });

  const deleteAttendance = useMutation({
    mutationFn: async (attendance: UnifiedAttendance) => {
      console.log('Eliminando presenza:', attendance);
      
      // Elimina dalla tabella unificata
      const { error: unifiedError } = await supabase
        .from('unified_attendances')
        .delete()
        .eq('id', attendance.id);

      if (unifiedError) throw unifiedError;

      // Se non è manuale, elimina anche dalla tabella attendances per mantenere la sincronizzazione
      if (!attendance.is_manual) {
        const { error: attendanceError } = await supabase
          .from('attendances')
          .delete()
          .eq('user_id', attendance.user_id)
          .eq('date', attendance.date);

        // Non bloccare se non trova record nella tabella attendances
        if (attendanceError) {
          console.warn('Errore eliminazione da attendances (non bloccante):', attendanceError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      toast({
        title: "Presenza eliminata",
        description: "La presenza è stata eliminata con successo",
      });
    },
    onError: (error: any) => {
      console.error('Errore eliminazione presenza:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nell'eliminazione della presenza",
        variant: "destructive",
      });
    },
  });

  return {
    attendances,
    isLoading,
    createManualAttendance: createManualAttendance.mutate,
    isCreating: createManualAttendance.isPending,
    deleteAttendance: deleteAttendance.mutate,
    isDeleting: deleteAttendance.isPending,
  };
};
