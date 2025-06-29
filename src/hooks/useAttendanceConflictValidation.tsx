
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isWithinInterval } from 'date-fns';

interface AttendanceConflictResult {
  hasConflict: boolean;
  conflictType?: 'business_trip' | 'ferie' | 'permesso' | 'malattia';
  conflictDetails?: string;
  message?: string;
}

export const useAttendanceConflictValidation = () => {
  const checkAttendanceConflicts = async (
    userId: string,
    date: string
  ): Promise<AttendanceConflictResult> => {
    if (!userId || !date) {
      return { hasConflict: false };
    }

    const checkDate = parseISO(date);

    try {
      // Controlla trasferte attive
      const { data: businessTrips, error: tripError } = await supabase
        .from('business_trips')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .lte('start_date', date)
        .gte('end_date', date);

      if (tripError) throw tripError;

      if (businessTrips && businessTrips.length > 0) {
        const trip = businessTrips[0];
        return {
          hasConflict: true,
          conflictType: 'business_trip',
          conflictDetails: `${trip.destination} (${trip.start_date} - ${trip.end_date})`,
          message: `Il dipendente è in trasferta a ${trip.destination} dal ${trip.start_date} al ${trip.end_date}.`
        };
      }

      // Controlla congedi approvati
      const { data: leaveRequests, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved');

      if (leaveError) throw leaveError;

      if (leaveRequests && leaveRequests.length > 0) {
        for (const request of leaveRequests) {
          let isConflicting = false;
          let conflictDetails = '';

          if (request.type === 'ferie' && request.date_from && request.date_to) {
            const startDate = parseISO(request.date_from);
            const endDate = parseISO(request.date_to);
            isConflicting = isWithinInterval(checkDate, { start: startDate, end: endDate });
            conflictDetails = `${request.date_from} - ${request.date_to}`;
          } else if ((request.type === 'permesso' || request.type === 'malattia') && request.day) {
            isConflicting = request.day === date;
            conflictDetails = request.day;
          }

          if (isConflicting) {
            return {
              hasConflict: true,
              conflictType: request.type as 'ferie' | 'permesso' | 'malattia',
              conflictDetails,
              message: `Il dipendente ha una richiesta di ${request.type} approvata per ${conflictDetails}.`
            };
          }
        }
      }

      return { hasConflict: false };
    } catch (error) {
      console.error('Errore controllo conflitti presenza:', error);
      return {
        hasConflict: true,
        message: 'Errore durante il controllo dei conflitti.'
      };
    }
  };

  return {
    checkAttendanceConflicts
  };
};

export default useAttendanceConflictValidation;
