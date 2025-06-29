
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isWithinInterval } from 'date-fns';

interface ConflictValidationResult {
  hasConflict: boolean;
  conflictType?: 'ferie' | 'permesso' | 'malattia';
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

    console.log('🔍 Controllo conflitti trasferta per:', {
      userId,
      startDate,
      endDate
    });

    try {
      // Cerca richieste di congedo approvate che si sovrappongono con le date della trasferta
      const { data: conflictingRequests, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved');

      if (error) {
        console.error('Errore nel controllo conflitti:', error);
        throw error;
      }

      if (!conflictingRequests || conflictingRequests.length === 0) {
        return { hasConflict: false };
      }

      const tripStart = parseISO(startDate);
      const tripEnd = parseISO(endDate);

      // Controlla ogni richiesta per sovrapposizioni
      for (const request of conflictingRequests) {
        let requestStart: Date;
        let requestEnd: Date;

        // Determina le date della richiesta in base al tipo
        if (request.type === 'ferie' && request.date_from && request.date_to) {
          requestStart = parseISO(request.date_from);
          requestEnd = parseISO(request.date_to);
        } else if (request.type === 'permesso' && request.day) {
          requestStart = parseISO(request.day);
          requestEnd = parseISO(request.day); // Permesso è per un solo giorno
        } else if (request.type === 'malattia' && request.day) {
          requestStart = parseISO(request.day);
          requestEnd = parseISO(request.day); // Malattia è per un solo giorno
        } else {
          continue; // Salta richieste con date mancanti
        }

        // Controlla sovrapposizione
        const hasOverlap = (tripStart <= requestEnd && tripEnd >= requestStart);

        if (hasOverlap) {
          console.log('🚨 Conflitto trovato:', {
            type: request.type,
            dates: request.type === 'ferie' 
              ? `${request.date_from} - ${request.date_to}`
              : request.day
          });

          let conflictDates: string;
          if (request.type === 'ferie') {
            conflictDates = `${request.date_from} - ${request.date_to}`;
          } else {
            conflictDates = request.day || '';
          }

          return {
            hasConflict: true,
            conflictType: request.type as 'ferie' | 'permesso' | 'malattia',
            conflictDates,
            conflictNote: request.note || undefined,
            message: `Non è possibile creare una trasferta perché il dipendente ha già una richiesta di ${request.type} approvata per il periodo ${conflictDates}.`
          };
        }
      }

      return { hasConflict: false };
    } catch (error) {
      console.error('Errore nella validazione conflitti trasferta:', error);
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
