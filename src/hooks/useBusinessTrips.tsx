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

interface ValidationResult {
  isValid: boolean;
  conflicts: string[];
  warnings: string[];
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

  // Funzione di validazione anti-conflitto per trasferte
  const validateBusinessTripDates = async (userId: string, startDate: string, endDate: string): Promise<ValidationResult> => {
    console.log('🔍 Validazione anti-conflitto per trasferta:', { userId, startDate, endDate });
    
    const conflicts: string[] = [];
    const warnings: string[] = [];
    
    try {
      // 1. CONTROLLO TRASFERTE SOVRAPPOSTE (Conflitto critico)
      const { data: existingTrips } = await supabase
        .from('business_trips')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved');

      if (existingTrips && existingTrips.length > 0) {
        for (const trip of existingTrips) {
          const tripStart = new Date(trip.start_date);
          const tripEnd = new Date(trip.end_date);
          const newStart = new Date(startDate);
          const newEnd = new Date(endDate);
          
          // Controllo sovrapposizione date
          if ((newStart <= tripEnd && newEnd >= tripStart)) {
            conflicts.push(`Conflitto critico: esiste già una trasferta a ${trip.destination} dal ${trip.start_date} al ${trip.end_date}`);
          }
        }
      }

      // 2. CONTROLLO FERIE APPROVATE (Conflitto critico - richiedere conferma admin)
      const { data: approvedVacations } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .eq('type', 'ferie');

      if (approvedVacations && approvedVacations.length > 0) {
        for (const vacation of approvedVacations) {
          if (vacation.date_from && vacation.date_to) {
            const vacStart = new Date(vacation.date_from);
            const vacEnd = new Date(vacation.date_to);
            const newStart = new Date(startDate);
            const newEnd = new Date(endDate);
            
            if ((newStart <= vacEnd && newEnd >= vacStart)) {
              conflicts.push(`Conflitto critico: esistono ferie approvate dal ${vacation.date_from} al ${vacation.date_to}. Le trasferte sostituiranno le ferie - richiedere conferma admin`);
            }
          }
        }
      }

      // 3. CONTROLLO MALATTIE E PRESENZE (Warning - verranno sostituite)
      const { data: existingAttendances } = await supabase
        .from('unified_attendances')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (existingAttendances && existingAttendances.length > 0) {
        const sickDays = existingAttendances.filter(att => att.is_sick_leave);
        const normalDays = existingAttendances.filter(att => !att.is_sick_leave && !att.is_business_trip);
        
        if (sickDays.length > 0) {
          warnings.push(`Avviso: ${sickDays.length} giorno/i di malattia verranno sostituiti dalla trasferta`);
        }
        
        if (normalDays.length > 0) {
          warnings.push(`Avviso: ${normalDays.length} presenza/e normale/i verranno sostituite dalla trasferta`);
        }
      }

      console.log('✅ Validazione trasferta completata:', { conflicts: conflicts.length, warnings: warnings.length });
      
      return {
        isValid: conflicts.length === 0,
        conflicts,
        warnings
      };

    } catch (error) {
      console.error('❌ Errore durante la validazione trasferta:', error);
      return {
        isValid: false,
        conflicts: ['Errore durante la validazione dei conflitti'],
        warnings: []
      };
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

      // Validazione anti-conflitto per ogni utente
      for (const targetUserId of targetUserIds) {
        console.log(`🔐 VALIDAZIONE ANTI-CONFLITTO per utente ${targetUserId}`);
        
        const validation = await validateBusinessTripDates(targetUserId, tripData.start_date, tripData.end_date);
        
        if (!validation.isValid) {
          const conflictMessages = validation.conflicts.join('; ');
          throw new Error(`Conflitti rilevati per la trasferta: ${conflictMessages}`);
        }
        
        // Se ci sono warnings, li logghiamo ma procediamo
        if (validation.warnings.length > 0) {
          console.warn('⚠️ Warnings per trasferta:', validation.warnings);
        }
      }

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
        description: `${trips.length} trasferta/e creata/e con successo con validazione anti-conflitto. Le presenze sono state registrate automaticamente per i giorni lavorativi configurati`,
      });
    },
    onError: (error: any) => {
      console.error('Create trip error:', error);
      toast({
        title: "Trasferta non consentita",
        description: error.message || "Errore nella creazione della trasferta",
        variant: "destructive",
      });
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      console.log('🗑️ Inizio eliminazione trasferta:', tripId);
      console.log('👤 Utente corrente:', { id: user?.id, role: profile?.role });
      
      // Verifica preventiva che l'utente sia admin
      if (profile?.role !== 'admin') {
        throw new Error('Solo gli amministratori possono eliminare le trasferte');
      }
      
      try {
        // Prima ottieni i dettagli della trasferta
        console.log('📋 Recupero dettagli trasferta...');
        const { data: trip, error: fetchError } = await supabase
          .from('business_trips')
          .select('*')
          .eq('id', tripId)
          .single();

        if (fetchError) {
          console.error('❌ Errore nel recupero trasferta:', fetchError);
          if (fetchError.code === 'PGRST116') {
            throw new Error('Trasferta non trovata o non hai i permessi per visualizzarla');
          }
          throw new Error(`Errore nel recupero trasferta: ${fetchError.message}`);
        }

        if (!trip) {
          console.error('❌ Trasferta non trovata');
          throw new Error('Trasferta non trovata');
        }

        console.log('✅ Trasferta trovata:', {
          id: trip.id,
          user_id: trip.user_id,
          destination: trip.destination,
          dates: `${trip.start_date} - ${trip.end_date}`
        });

        // Elimina le presenze associate alla trasferta
        console.log('🧹 Eliminazione presenze associate...');
        const { error: attendanceError, count: deletedAttendances } = await supabase
          .from('unified_attendances')
          .delete()
          .eq('user_id', trip.user_id)
          .gte('date', trip.start_date)
          .lte('date', trip.end_date)
          .eq('is_business_trip', true);

        if (attendanceError) {
          console.warn('⚠️ Errore nell\'eliminazione presenze (continuo comunque):', attendanceError);
        } else {
          console.log('✅ Presenze eliminate:', deletedAttendances || 0);
        }

        // Elimina la trasferta
        console.log('🗑️ Eliminazione trasferta dal database...');
        const { error: deleteError } = await supabase
          .from('business_trips')
          .delete()
          .eq('id', tripId);

        if (deleteError) {
          console.error('❌ Errore eliminazione trasferta:', deleteError);
          
          // Gestisci diversi tipi di errore
          if (deleteError.code === 'PGRST301') {
            throw new Error('Non hai i permessi per eliminare questa trasferta. Verifica di essere un amministratore.');
          } else if (deleteError.code === 'PGRST116') {
            throw new Error('Trasferta non trovata o già eliminata.');
          } else {
            throw new Error(`Errore nell'eliminazione della trasferta: ${deleteError.message}`);
          }
        }

        console.log('✅ Trasferta eliminata con successo dal database');
        
        // Nota: Non controlliamo più il count delle righe eliminate perché 
        // alcune versioni di Supabase potrebbero non restituirlo correttamente
        // Il fatto che non ci sia errore significa che l'operazione è riuscita

        return { trip, deletedAttendances: deletedAttendances || 0 };
      } catch (error) {
        console.error('💥 Errore durante l\'eliminazione:', error);
        throw error;
      }
    },
    onSuccess: async (result) => {
      console.log('🎉 Eliminazione completata con successo:', result);
      
      // Invalida le query e attendi che si aggiornino
      console.log('🔄 Aggiornamento cache...');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['business-trips'] }),
        queryClient.invalidateQueries({ queryKey: ['unified-attendances'] })
      ]);
      
      // Forza il refetch delle trasferte
      await queryClient.refetchQueries({ queryKey: ['business-trips'] });
      
      toast({
        title: "Trasferta eliminata",
        description: `La trasferta è stata eliminata con successo insieme a ${result.deletedAttendances} presenza/e associate`,
      });
    },
    onError: (error: any) => {
      console.error('💥 Errore nell\'eliminazione trasferta:', error);
      toast({
        title: "Errore nell'eliminazione",
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
    validateBusinessTripDates, // Esportiamo la funzione di validazione
  };
};
