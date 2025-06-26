
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { format, isAfter, isBefore, isToday, parseISO } from 'date-fns';

export interface EmployeeStatus {
  canCheckIn: boolean;
  canCheckOut: boolean;
  currentStatus: 'available' | 'sick' | 'vacation' | 'permission' | 'business_trip' | 'pending_request';
  blockingReasons: string[];
  statusDetails?: {
    type: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
  };
}

export const useEmployeeStatus = (userId?: string, checkDate?: string) => {
  const { user } = useAuth();
  const { workSchedule } = useWorkSchedules();
  const targetUserId = userId || user?.id;
  const targetDate = checkDate || format(new Date(), 'yyyy-MM-dd');

  const { data: employeeStatus, isLoading } = useQuery({
    queryKey: ['employee-status', targetUserId, targetDate],
    queryFn: async (): Promise<EmployeeStatus> => {
      if (!targetUserId) {
        return {
          canCheckIn: false,
          canCheckOut: false,
          currentStatus: 'available',
          blockingReasons: ['Utente non autenticato']
        };
      }

      const blockingReasons: string[] = [];
      let currentStatus: EmployeeStatus['currentStatus'] = 'available';
      let statusDetails: EmployeeStatus['statusDetails'] | undefined;

      // 1. Controlla se c'è una richiesta pending
      const { data: pendingRequests } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('status', 'pending');

      if (pendingRequests && pendingRequests.length > 0) {
        const request = pendingRequests[0];
        currentStatus = 'pending_request';
        blockingReasons.push(`Hai una richiesta di ${request.type} in attesa di approvazione`);
        statusDetails = {
          type: request.type,
          startDate: request.date_from || request.day,
          endDate: request.date_to || request.day,
          notes: request.note || undefined
        };
      }

      // 2. Controlla presenza/stato nel giorno specifico
      const { data: todayAttendance } = await supabase
        .from('unified_attendances')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('date', targetDate)
        .single();

      if (todayAttendance) {
        if (todayAttendance.is_sick_leave) {
          currentStatus = 'sick';
          blockingReasons.push('Sei registrato come in malattia per oggi');
          statusDetails = {
            type: 'malattia',
            startDate: targetDate,
            notes: todayAttendance.notes || undefined
          };
        } else if (todayAttendance.is_business_trip) {
          currentStatus = 'business_trip';
          blockingReasons.push('Sei registrato come in trasferta per oggi');
          statusDetails = {
            type: 'trasferta',
            startDate: targetDate,
            notes: todayAttendance.notes || undefined
          };
        } else if (todayAttendance.notes === 'Ferie') {
          currentStatus = 'vacation';
          blockingReasons.push('Sei registrato come in ferie per oggi');
          statusDetails = {
            type: 'ferie',
            startDate: targetDate,
            notes: todayAttendance.notes || undefined
          };
        } else if (todayAttendance.notes === 'Permesso') {
          currentStatus = 'permission';
          blockingReasons.push('Sei registrato come in permesso per oggi');
          statusDetails = {
            type: 'permesso',
            startDate: targetDate,
            notes: todayAttendance.notes || undefined
          };
        }
      }

      // 3. Controlla ferie/permessi approvati per periodo che include oggi
      const { data: approvedLeaves } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('status', 'approved');

      if (approvedLeaves) {
        for (const leave of approvedLeaves) {
          if (leave.type === 'ferie' && leave.date_from && leave.date_to) {
            const startDate = parseISO(leave.date_from);
            const endDate = parseISO(leave.date_to);
            const checkDateObj = parseISO(targetDate);
            
            if (!isBefore(checkDateObj, startDate) && !isAfter(checkDateObj, endDate)) {
              currentStatus = 'vacation';
              blockingReasons.push(`Sei in ferie dal ${leave.date_from} al ${leave.date_to}`);
              statusDetails = {
                type: 'ferie',
                startDate: leave.date_from,
                endDate: leave.date_to,
                notes: leave.note || undefined
              };
              break;
            }
          } else if (leave.type === 'permesso' && leave.day === targetDate) {
            currentStatus = 'permission';
            if (leave.time_from && leave.time_to) {
              blockingReasons.push(`Hai un permesso orario dalle ${leave.time_from} alle ${leave.time_to}`);
            } else {
              blockingReasons.push('Hai un permesso giornaliero per oggi');
            }
            statusDetails = {
              type: 'permesso',
              startDate: leave.day,
              notes: leave.note || undefined
            };
            break;
          }
        }
      }

      // 4. Verifica orari lavorativi solo se oggi
      const isWorkingDay = workSchedule && isToday(parseISO(targetDate)) ? (() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
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
      })() : true;

      if (!isWorkingDay && isToday(parseISO(targetDate))) {
        blockingReasons.push('Oggi non è un giorno lavorativo');
      }

      // Determina possibilità di check-in/out
      const canCheckIn = currentStatus === 'available' && blockingReasons.length === 0;
      const canCheckOut = todayAttendance && !todayAttendance.check_out_time && currentStatus === 'available';

      return {
        canCheckIn,
        canCheckOut: !!canCheckOut,
        currentStatus,
        blockingReasons,
        statusDetails
      };
    },
    enabled: !!targetUserId,
  });

  return {
    employeeStatus,
    isLoading,
    refreshStatus: () => {
      // Helper per refreshare lo status
    }
  };
};
