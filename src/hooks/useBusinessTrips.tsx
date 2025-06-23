
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { format, eachDayOfInterval } from 'date-fns';

export interface BusinessTrip {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  destination: string;
  reason: string | null;
  status: 'approved';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export const useBusinessTrips = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { workSchedule } = useWorkSchedules();

  // Funzione per verificare se un giorno è lavorativo basata sulla configurazione
  const isWorkingDay = (date: Date) => {
    if (!workSchedule) return false;
    
    const dayOfWeek = date.getDay();
    switch (dayOfWeek) {
      case 0: return workSchedule.sunday;
      case 1: return workSchedule.monday;
      case 2: return workSchedule.tuesday;
      case 3: return workSchedule.wednesday;
      case 4: return workSchedule.thursday;
      case 5: return workSchedule.friday;
      case 6: return workSchedule.saturday;
      default: return false;
    }
  };

  const { data: businessTrips, isLoading } = useQuery({
    queryKey: ['business-trips'],
    queryFn: async () => {
      let query = supabase
        .from('business_trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data: tripData, error } = await query;

      if (error) {
        console.error('Error fetching business trips:', error);
        throw error;
      }

      // Se è admin, ottieni anche i profili degli utenti
      if (profile?.role === 'admin' && tripData && tripData.length > 0) {
        const userIds = [...new Set(tripData.map(trip => trip.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Combina i dati
        const tripsWithProfiles = tripData.map(trip => ({
          ...trip,
          profiles: profilesData?.find(profile => profile.id === trip.user_id) || null
        }));

        return tripsWithProfiles as BusinessTrip[];
      }

      return tripData as BusinessTrip[];
    },
    enabled: !!user && !!profile && !!workSchedule,
  });

  const createTrip = useMutation({
    mutationFn: async (tripData: {
      user_ids?: string[]; // Nuovo: array di IDs utenti per supportare più dipendenti
      user_id?: string;
      start_date: string;
      end_date: string;
      destination: string;
      reason: string;
    }) => {
      // Verifica che la configurazione degli orari sia disponibile
      if (!workSchedule) {
        throw new Error('Configurazione orari di lavoro non disponibile');
      }

      // Determina gli utenti target
      let targetUserIds: string[] = [];
      if (tripData.user_ids && tripData.user_ids.length > 0) {
        // Modalità multi-utente (nuova)
        targetUserIds = tripData.user_ids;
      } else if (tripData.user_id) {
        // Modalità singolo utente (retrocompatibilità)
        targetUserIds = [tripData.user_id];
      } else {
        // Utente corrente
        if (!user?.id) throw new Error('Utente non autenticato');
        targetUserIds = [user.id];
      }

      const createdTrips = [];

      // Crea una trasferta per ogni utente selezionato
      for (const targetUserId of targetUserIds) {
        // Crea la trasferta (sempre approvata)
        const { data: trip, error } = await supabase
          .from('business_trips')
          .insert({
            user_id: targetUserId,
            start_date: tripData.start_date,
            end_date: tripData.end_date,
            destination: tripData.destination,
            reason: tripData.reason,
            status: 'approved',
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        createdTrips.push(trip);

        // Genera tutti i giorni della trasferta
        const startDate = new Date(tripData.start_date);
        const endDate = new Date(tripData.end_date);
        const allDays = eachDayOfInterval({ start: startDate, end: endDate });
        
        // Filtra solo i giorni lavorativi basandosi sulla configurazione degli orari
        const workingDays = allDays.filter(day => isWorkingDay(day));

        // Crea le presenze per tutti i giorni lavorativi della trasferta
        const attendancesToCreate = workingDays.map(day => ({
          user_id: targetUserId,
          date: format(day, 'yyyy-MM-dd'),
          check_in_time: workSchedule.start_time,
          check_out_time: workSchedule.end_time,
          is_manual: true,
          is_business_trip: true,
          notes: `Trasferta: ${tripData.destination}`,
          created_by: user?.id,
        }));

        if (attendancesToCreate.length > 0) {
          const { error: attendanceError } = await supabase
            .from('unified_attendances')
            .upsert(attendancesToCreate, {
              onConflict: 'user_id,date'
            });

          if (attendanceError) {
            console.error('Error creating trip attendances:', attendanceError);
            // Non blocchiamo la creazione della trasferta se c'è un errore nelle presenze
          }
        }
      }

      return createdTrips;
    },
    onSuccess: (trips) => {
      queryClient.invalidateQueries({ queryKey: ['business-trips'] });
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      toast({
        title: "Trasferte create",
        description: `${trips.length} trasferta/e creata/e con successo. Le presenze sono state registrate automaticamente per i giorni lavorativi configurati`,
      });
    },
    onError: (error: any) => {
      console.error('Create trip error:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nella creazione della trasferta",
        variant: "destructive",
      });
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      console.log('Iniziando eliminazione trasferta:', tripId);
      
      // Prima ottieni i dettagli della trasferta
      const { data: trip, error: fetchError } = await supabase
        .from('business_trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (fetchError) {
        console.error('Errore nel recupero trasferta:', fetchError);
        throw fetchError;
      }

      console.log('Trasferta trovata:', trip);

      // Elimina le presenze associate alla trasferta
      const { error: attendanceError } = await supabase
        .from('unified_attendances')
        .delete()
        .eq('user_id', trip.user_id)
        .gte('date', trip.start_date)
        .lte('date', trip.end_date)
        .eq('is_business_trip', true);

      if (attendanceError) {
        console.error('Error deleting trip attendances:', attendanceError);
        // Non blocchiamo l'eliminazione della trasferta
      }

      // Elimina la trasferta
      const { error: deleteError } = await supabase
        .from('business_trips')
        .delete()
        .eq('id', tripId);

      if (deleteError) {
        console.error('Errore eliminazione trasferta:', deleteError);
        throw deleteError;
      }

      console.log('Trasferta eliminata con successo');
      return trip;
    },
    onSuccess: async () => {
      console.log('Invalidando cache...');
      // Invalida le query e attendi che si aggiornino
      await queryClient.invalidateQueries({ queryKey: ['business-trips'] });
      await queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      
      // Forza il refetch delle trasferte
      await queryClient.refetchQueries({ queryKey: ['business-trips'] });
      
      toast({
        title: "Trasferta eliminata",
        description: "La trasferta e le presenze associate sono state eliminate con successo",
      });
    },
    onError: (error: any) => {
      console.error('Delete trip error:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nell'eliminazione della trasferta",
        variant: "destructive",
      });
    },
  });

  return {
    businessTrips,
    isLoading,
    createTrip: createTrip.mutate,
    isCreating: createTrip.isPending,
    deleteTrip: deleteTripMutation.mutate,
    isDeleting: deleteTripMutation.isPending,
    isWorkingDay, // Esportiamo la funzione per uso nei componenti
  };
};
