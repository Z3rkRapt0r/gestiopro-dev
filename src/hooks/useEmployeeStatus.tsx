
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { format, isAfter, isBefore, isToday, parseISO, isWithinInterval } from 'date-fns';

export interface EmployeeStatus {
  canCheckIn: boolean;
  canCheckOut: boolean;
  currentStatus: 'available' | 'sick' | 'vacation' | 'permission' | 'business_trip' | 'pending_request' | 'already_present' | 'permission_active' | 'permission_ended';
  blockingReasons: string[];
  statusDetails?: {
    type: string;
    startDate?: string;
    endDate?: string;
    timeFrom?: string;
    timeTo?: string;
    notes?: string;
    canCheckInAfter?: string; // Nuovo: quando può fare check-in dopo un permesso
  };
  conflictPriority: number; // 0=no conflict, 1=lowest, 5=highest
  canCheckInAfterTime?: string; // Quando può fare check-in (per permessi orari)
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
          blockingReasons: ['Utente non autenticato'],
          conflictPriority: 0
        };
      }

      const blockingReasons: string[] = [];
      let currentStatus: EmployeeStatus['currentStatus'] = 'available';
      let statusDetails: EmployeeStatus['statusDetails'] | undefined;
      let conflictPriority = 0;
      let canCheckInAfterTime: string | undefined;

      const currentTime = new Date();
      const currentTimeString = format(currentTime, 'HH:mm');

      // PRIORITÀ DEI CONFLITTI (dal più importante al meno importante):
      // 1. Malattia (priorità 5)
      // 2. Ferie (priorità 4) 
      // 3. Trasferta (priorità 3) - Aggiornata priorità per trasferte
      // 4. Permesso attivo (priorità 2) - Nuova categoria per permessi attivi
      // 5. Già presente (priorità 1)

      // 1. CONTROLLO MALATTIA - Priorità massima
      const { data: sickLeave } = await supabase
        .from('unified_attendances')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('date', targetDate)
        .eq('is_sick_leave', true)
        .single();

      if (sickLeave) {
        currentStatus = 'sick';
        conflictPriority = 5;
        blockingReasons.push('Il dipendente è registrato come in malattia per questa data');
        statusDetails = {
          type: 'Malattia',
          startDate: targetDate,
          notes: sickLeave.notes || undefined
        };
      }

      // 2. CONTROLLO FERIE APPROVATE - Seconda priorità
      if (conflictPriority < 4) {
        const { data: approvedVacations } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('status', 'approved')
          .eq('type', 'ferie');

        if (approvedVacations) {
          for (const vacation of approvedVacations) {
            if (vacation.date_from && vacation.date_to) {
              const startDate = parseISO(vacation.date_from);
              const endDate = parseISO(vacation.date_to);
              const checkDateObj = parseISO(targetDate);
              
              if (isWithinInterval(checkDateObj, { start: startDate, end: endDate })) {
                currentStatus = 'vacation';
                conflictPriority = 4;
                blockingReasons.push(`Il dipendente è in ferie dal ${vacation.date_from} al ${vacation.date_to}`);
                statusDetails = {
                  type: 'Ferie',
                  startDate: vacation.date_from,
                  endDate: vacation.date_to,
                  notes: vacation.note || undefined
                };
                break;
              }
            }
          }
        }
      }

      // 3. CONTROLLO TRASFERTE - Terza priorità (aumentata da 2 a 3)
      if (conflictPriority < 3) {
        const { data: businessTrips } = await supabase
          .from('business_trips')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('status', 'approved');

        if (businessTrips) {
          for (const trip of businessTrips) {
            const startDate = parseISO(trip.start_date);
            const endDate = parseISO(trip.end_date);
            const checkDateObj = parseISO(targetDate);
            
            if (isWithinInterval(checkDateObj, { start: startDate, end: endDate })) {
              currentStatus = 'business_trip';
              conflictPriority = 3;
              blockingReasons.push(`Il dipendente è in trasferta a ${trip.destination} dal ${trip.start_date} al ${trip.end_date}`);
              statusDetails = {
                type: 'Trasferta',
                startDate: trip.start_date,
                endDate: trip.end_date,
                notes: `Destinazione: ${trip.destination}. ${trip.reason || ''}`
              };
              break;
            }
          }
        }
      }

      // 4. CONTROLLO PERMESSI APPROVATI - Logica migliorata per permessi orari
      if (conflictPriority < 2) {
        const { data: approvedPermissions } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('status', 'approved')
          .eq('type', 'permesso')
          .eq('day', targetDate);

        if (approvedPermissions && approvedPermissions.length > 0) {
          const permission = approvedPermissions[0];
          
          if (permission.time_from && permission.time_to && isToday(parseISO(targetDate))) {
            // Permesso orario - controllo se è ancora attivo
            const permissionStart = permission.time_from;
            const permissionEnd = permission.time_to;
            
            if (currentTimeString >= permissionStart && currentTimeString <= permissionEnd) {
              // Permesso attualmente attivo
              currentStatus = 'permission_active';
              conflictPriority = 2;
              blockingReasons.push(`Il dipendente ha un permesso orario attivo dalle ${permissionStart} alle ${permissionEnd}`);
              statusDetails = {
                type: 'Permesso orario attivo',
                startDate: permission.day,
                timeFrom: permissionStart,
                timeTo: permissionEnd,
                notes: permission.note || undefined,
                canCheckInAfter: permissionEnd
              };
              canCheckInAfterTime = permissionEnd;
            } else if (currentTimeString < permissionStart) {
              // Permesso futuro oggi
              currentStatus = 'permission';
              conflictPriority = 2;
              blockingReasons.push(`Il dipendente ha un permesso orario programmato dalle ${permissionStart} alle ${permissionEnd}`);
              statusDetails = {
                type: 'Permesso orario programmato',
                startDate: permission.day,
                timeFrom: permissionStart,
                timeTo: permissionEnd,
                notes: permission.note || undefined
              };
            } else {
              // Permesso terminato - può fare check-in ma potrebbe essere in ritardo
              currentStatus = 'permission_ended';
              conflictPriority = 0; // Non blocca più
              statusDetails = {
                type: 'Permesso orario terminato',
                startDate: permission.day,
                timeFrom: permissionStart,
                timeTo: permissionEnd,
                notes: permission.note || undefined,
                canCheckInAfter: permissionEnd
              };
              canCheckInAfterTime = permissionEnd;
            }
          } else {
            // Permesso giornaliero
            currentStatus = 'permission';
            conflictPriority = 2;
            blockingReasons.push('Il dipendente ha un permesso giornaliero per oggi');
            statusDetails = {
              type: 'Permesso giornaliero',
              startDate: permission.day,
              notes: permission.note || undefined
            };
          }
        }
      }

      // 5. CONTROLLO PRESENZA GIÀ REGISTRATA - Quinta priorità
      if (conflictPriority < 1) {
        const { data: existingAttendance } = await supabase
          .from('unified_attendances')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('date', targetDate)
          .eq('is_sick_leave', false)
          .single();

        if (existingAttendance && !existingAttendance.is_business_trip) {
          currentStatus = 'already_present';
          conflictPriority = 1;
          blockingReasons.push('Il dipendente ha già registrato la presenza per questa data');
          statusDetails = {
            type: 'Presenza già registrata',
            startDate: targetDate,
            notes: existingAttendance.notes || undefined
          };
        }
      }

      // 6. CONTROLLO RICHIESTE PENDING - Solo avviso, non blocca
      if (conflictPriority === 0) {
        const { data: pendingRequests } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('status', 'pending');

        if (pendingRequests && pendingRequests.length > 0) {
          const request = pendingRequests[0];
          
          // Controlla se la richiesta pending riguarda la data target
          let isRelevant = false;
          if (request.type === 'ferie' && request.date_from && request.date_to) {
            const startDate = parseISO(request.date_from);
            const endDate = parseISO(request.date_to);
            const checkDateObj = parseISO(targetDate);
            isRelevant = isWithinInterval(checkDateObj, { start: startDate, end: endDate });
          } else if (request.type === 'permesso' && request.day === targetDate) {
            isRelevant = true;
          }
          
          if (isRelevant) {
            currentStatus = 'pending_request';
            blockingReasons.push(`Il dipendente ha una richiesta di ${request.type} in attesa di approvazione per questo periodo`);
            statusDetails = {
              type: `Richiesta ${request.type} in attesa`,
              startDate: request.date_from || request.day,
              endDate: request.date_to || request.day,
              notes: request.note || undefined
            };
          }
        }
      }

      // 7. VERIFICA ORARI LAVORATIVI (solo se oggi e nessun conflitto)
      if (conflictPriority === 0 && isToday(parseISO(targetDate))) {
        const isWorkingDay = workSchedule ? (() => {
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

        if (!isWorkingDay) {
          blockingReasons.push('Oggi non è un giorno lavorativo secondo la configurazione');
        }
      }

      // DETERMINAZIONE FINALE DELLE CAPACITÀ
      const canCheckIn = conflictPriority === 0 && blockingReasons.length === 0;
      const canCheckOut = conflictPriority <= 1 && currentStatus === 'already_present';

      return {
        canCheckIn,
        canCheckOut,
        currentStatus,
        blockingReasons,
        statusDetails,
        conflictPriority,
        canCheckInAfterTime
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
