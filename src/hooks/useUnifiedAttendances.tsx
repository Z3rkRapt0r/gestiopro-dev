
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
  is_business_trip: boolean | null;
  is_manual: boolean;
  notes?: string | null;
  created_at: string;
  profiles?: {
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
      console.log('Caricamento presenze unificate...');
      
      // Prima ottieni le presenze manuali
      let manualQuery = supabase
        .from('manual_attendances')
        .select('*')
        .order('date', { ascending: false });

      // Poi ottieni le presenze automatiche
      let attendanceQuery = supabase
        .from('attendances')
        .select('*')
        .order('date', { ascending: false });

      // Se non è admin, filtra per utente corrente
      if (profile?.role !== 'admin') {
        manualQuery = manualQuery.eq('user_id', user?.id);
        attendanceQuery = attendanceQuery.eq('user_id', user?.id);
      }

      const [manualResult, attendanceResult] = await Promise.all([
        manualQuery,
        attendanceQuery
      ]);

      if (manualResult.error) {
        console.error('Errore caricamento manual_attendances:', manualResult.error);
        throw manualResult.error;
      }

      if (attendanceResult.error) {
        console.error('Errore caricamento attendances:', attendanceResult.error);
        throw attendanceResult.error;
      }

      const allAttendances: UnifiedAttendance[] = [];

      // Prima aggiungi tutte le presenze automatiche
      attendanceResult.data?.forEach(att => {
        allAttendances.push({
          ...att,
          is_manual: false,
          notes: null,
        });
      });

      // Poi sovrascrivi con le presenze manuali (hanno precedenza)
      manualResult.data?.forEach(manual => {
        const existingIndex = allAttendances.findIndex(
          att => att.user_id === manual.user_id && att.date === manual.date
        );
        
        if (existingIndex >= 0) {
          // Sovrascrivi la presenza automatica con quella manuale
          const existingAttendance = allAttendances[existingIndex];
          allAttendances[existingIndex] = {
            ...manual,
            is_manual: true,
            is_business_trip: existingAttendance.is_business_trip || false,
          };
        } else {
          // Aggiungi nuova presenza manuale
          allAttendances.push({
            ...manual,
            is_manual: true,
            is_business_trip: false,
          });
        }
      });

      // Ordina per data decrescente
      allAttendances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

        // Aggiungi i profili
        allAttendances.forEach(attendance => {
          attendance.profiles = profilesData?.find(profile => profile.id === attendance.user_id) || null;
        });
      }

      console.log('Presenze unificate caricate:', allAttendances);
      return allAttendances;
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
    }) => {
      console.log('Creazione presenza manuale:', attendanceData);
      
      // Inserisci nella tabella manual_attendances usando upsert
      const { data: manualData, error: manualError } = await supabase
        .from('manual_attendances')
        .upsert({
          ...attendanceData,
          created_by: user?.id,
        }, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (manualError) {
        console.error('Errore salvataggio presenza manuale:', manualError);
        throw manualError;
      }

      console.log('Presenza manuale salvata:', manualData);
      return manualData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      toast({
        title: "Presenza salvata",
        description: "La presenza manuale è stata registrata con successo",
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
    mutationFn: async (attendanceId: string) => {
      // Prima prova a eliminare dalle presenze manuali
      const { data: manualCheck } = await supabase
        .from('manual_attendances')
        .select('id')
        .eq('id', attendanceId)
        .single();

      if (manualCheck) {
        const { error: manualError } = await supabase
          .from('manual_attendances')
          .delete()
          .eq('id', attendanceId);

        if (manualError) {
          throw manualError;
        }
      } else {
        // Se non è nelle presenze manuali, elimina da quelle automatiche
        const { error: attendanceError } = await supabase
          .from('attendances')
          .delete()
          .eq('id', attendanceId);

        if (attendanceError) {
          throw attendanceError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
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
