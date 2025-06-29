
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isWithinInterval } from 'date-fns';

interface ConflictValidationResult {
  hasConflict: boolean;
  conflictType?: 'ferie' | 'permesso' | 'malattia' | 'business_trip';
  conflictDates?: string;
  conflictNote?: string;
  message?: string;
}

export const useBusinessTripValidation = () => {
  const validateTripConflicts = async (
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ConflictValidationResult> => {
    if (!userId || !startDate || !endDate) {
      return { hasConflict: false };
    }

    console.log('🔍 Controllo conflitti trasferta completi per:', {
      userId,
      startDate,
      endDate
    });

    try {
      const tripStart = parseISO(startDate);
      const tripEnd = parseISO(endDate);

      // 1. Controllo trasferte esistenti sovrapposte
      const { data: existingTrips, error: tripsError } = await supabase
        .from('business_trips')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved');

      if (tripsError) {
        console.error('Errore controllo trasferte esistenti:', tripsError);
        throw tripsError;
      }

      if (existingTrips && existingTrips.length > 0) {
        for (const trip of existingTrips) {
          const existingStart = parseISO(trip.start_date);
          const existingEnd = parseISO(trip.end_date);
          
          const hasOverlap = (tripStart <= existingEnd && tripEnd >= existingStart);
          
          if (hasOverlap) {
            return {
              hasConflict: true,
              conflictType: 'business_trip',
              conflictDates: `${trip.start_date} - ${trip.end_date}`,
              message: `🚫 Conflitto con trasferta esistente: ${trip.destination} dal ${trip.start_date} al ${trip.end_date}.`
            };
          }
        }
      }

      // 2. Controllo malattie esistenti nel range
      const { data: sickLeaves, error: sickError } = await supabase
        .from('unified_attendances')
        .select('*')
        .eq('user_id', userId)
        .eq('is_sick_leave', true)
        .gte('date', startDate)
        .lte('date', endDate);

      if (sickError) {
        console.error('Errore controllo malattie:', sickError);
        throw sickError;
      }

      if (sickLeaves && sickLeaves.length > 0) {
        const conflictDates = sickLeaves.map(s => s.date).join(', ');
        return {
          hasConflict: true,
          conflictType: 'malattia',
          conflictDates,
          message: `🏥 Conflitto con giorni di malattia: ${conflictDates}.`
        };
      }

      // 3. Controllo richieste di congedo approvate
      const { data: conflictingRequests, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved');

      if (leaveError) {
        console.error('Errore controllo congedi:', leaveError);
        throw leaveError;
      }

      if (conflictingRequests && conflictingRequests.length > 0) {
        for (const request of conflictingRequests) {
          let requestStart: Date;
          let requestEnd: Date;

          // Determina le date della richiesta in base al tipo
          if (request.type === 'ferie' && request.date_from && request.date_to) {
            requestStart = parseISO(request.date_from);
            requestEnd = parseISO(request.date_to);
          } else if (request.type === 'permesso' && request.day) {
            requestStart = parseISO(request.day);
            requestEnd = parseISO(request.day);
          } else if (request.type === 'malattia' && request.day) {
            requestStart = parseISO(request.day);
            requestEnd = parseISO(request.day);
          } else {
            continue;
          }

          // Controlla sovrapposizione
          const hasOverlap = (tripStart <= requestEnd && tripEnd >= requestStart);

          if (hasOverlap) {
            console.log('🚨 Conflitto congedo trovato:', {
              type: request.type,
              dates: request.type === 'ferie' 
                ? `${request.date_from} - ${request.date_to}`
                : request.day
            });

            let conflictDates: string;
            let message: string;

            if (request.type === 'ferie') {
              conflictDates = `${request.date_from} - ${request.date_to}`;
              message = `🏖️ Conflitto con ferie approvate: ${conflictDates}.`;
            } else if (request.type === 'permesso') {
              conflictDates = request.day || '';
              const timeInfo = request.time_from && request.time_to 
                ? ` (${request.time_from}-${request.time_to})`
                : '';
              message = `📅 Conflitto con permesso approvato: ${conflictDates}${timeInfo}.`;
            } else {
              conflictDates = request.day || '';
              message = `🏥 Conflitto con malattia approvata: ${conflictDates}.`;
            }

            return {
              hasConflict: true,
              conflictType: request.type as 'ferie' | 'permesso' | 'malattia',
              conflictDates,
              conflictNote: request.note || undefined,
              message
            };
          }
        }
      }

      console.log('✅ Nessun conflitto trovato per la trasferta');
      return { hasConflict: false };
    } catch (error) {
      console.error('Errore nella validazione completa conflitti trasferta:', error);
      return {
        hasConflict: true,
        message: 'Errore durante il controllo dei conflitti. Riprova.'
      };
    }
  };

  return {
    validateTripConflicts
  };
};

export default useBusinessTripValidation;
