
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
      
      // Prima ottieni le presenze automatiche
      let attendanceQuery = supabase
        .from('attendances')
        .select('*')
        .order('date', { ascending: false });

      // Poi ottieni le presenze manuali
      let manualQuery = supabase
        .from('manual_attendances')
        .select('*')
        .order('date', { ascending: false });

      // Se non è admin, filtra per utente corrente
      if (profile?.role !== 'admin') {
        attendanceQuery = attendanceQuery.eq('user_id', user?.id);
        manualQuery = manualQuery.eq('user_id', user?.id);
      }

      const [attendanceResult, manualResult] = await Promise.all([
        attendanceQuery,
        manualQuery
      ]);

      if (attendanceResult.error) {
        console.error('Errore caricamento attendances:', attendanceResult.error);
        throw attendanceResult.error;
      }

      if (manualResult.error) {
        console.error('Errore caricamento manual_attendances:', manualResult.error);
        throw manualResult.error;
      }

      // Crea un Map per tracciare le presenze per data e utente
      const attendanceMap = new Map<string, UnifiedAttendance>();

      // Prima aggiungi tutte le presenze automatiche
      attendanceResult.data?.forEach(att => {
        const key = `${att.user_id}-${att.date}`;
        attendanceMap.set(key, {
          ...att,
          is_manual: false,
          notes: null,
        });
      });

      // Poi aggiungi/sovrascrivi con le presenze manuali
      manualResult.data?.forEach(manual => {
        const key = `${manual.user_id}-${manual.date}`;
        const existingAtt = attendanceMap.get(key);
        
        attendanceMap.set(key, {
          id: manual.id,
          user_id: manual.user_id,
          date: manual.date,
          check_in_time: manual.check_in_time,
          check_out_time: manual.check_out_time,
          is_business_trip: existingAtt?.is_business_trip || false,
          is_manual: true,
          notes: manual.notes,
          created_at: manual.created_at,
        });
      });

      // Converti in array e ordina per data
      const allAttendances = Array.from(attendanceMap.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
      
      // Inserisci/aggiorna nella tabella manual_attendances
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
    mutationFn: async (attendance: UnifiedAttendance) => {
      if (attendance.is_manual) {
        // Elimina dalla tabella manual_attendances
        const { error } = await supabase
          .from('manual_attendances')
          .delete()
          .eq('id', attendance.id);

        if (error) throw error;
      } else {
        // Elimina dalla tabella attendances
        const { error } = await supabase
          .from('attendances')
          .delete()
          .eq('id', attendance.id);

        if (error) throw error;
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
