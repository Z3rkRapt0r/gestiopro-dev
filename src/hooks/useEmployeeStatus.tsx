
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useEmployeeWorkSchedule } from '@/hooks/useEmployeeWorkSchedule';
import { format, isAfter, isBefore, isToday, parseISO, isWithinInterval } from 'date-fns';

export interface EmployeeStatus {
  canCheckIn: boolean;
  canCheckOut: boolean;
  currentStatus: 'available' | 'sick' | 'vacation' | 'permission' | 'business_trip' | 'pending_request' | 'already_present';
  blockingReasons: string[];
  statusDetails?: {
    type: string;
    startDate?: string;
    endDate?: string;
    timeFrom?: string;
    timeTo?: string;
    notes?: string;
  };
  conflictPriority: number; // 0=no conflict, 1=lowest, 5=highest
  allowPermissionOverlap: boolean; // Permette sovrapposizione con permessi
  hasHardBlock: boolean; // Solo per malattia, ferie, trasferte - blocca le date nel calendario
  hasHourlyPermission?: boolean; // Se ha un permesso orario attivo
  isPermissionExpired?: boolean; // Se il permesso orario è scaduto
  canSecondCheckIn?: boolean; // Se può fare la seconda entrata
  permissionEndTime?: string; // Orario di fine permesso
  isStartOfDayPermission?: boolean; // Se il permesso è di inizio giornata
  isMidDayPermission?: boolean; // Se il permesso è in mezzo alla giornata
}

export const useEmployeeStatus = (userId?: string, checkDate?: string) => {
  console.log('🚀 [useEmployeeStatus] Chiamata con:', { userId, checkDate });
  
  const { user } = useAuth();
  const { workSchedule } = useWorkSchedules();
  const { workSchedule: employeeWorkSchedule } = useEmployeeWorkSchedule(userId || user?.id);
  const targetUserId = userId || user?.id;
  const targetDate = checkDate || format(new Date(), 'yyyy-MM-dd');
  
  console.log('🚀 [useEmployeeStatus] Parametri finali:', { targetUserId, targetDate });

  const { data: employeeStatus, isLoading } = useQuery({
    queryKey: ['employee-status', targetUserId, targetDate],
    staleTime: 0, // Forza il refetch per debug
    queryFn: async (): Promise<EmployeeStatus> => {
      console.log('🔍 [useEmployeeStatus] Query function chiamata per:', { targetUserId, targetDate });
      
      if (!targetUserId) {
        console.log('❌ [useEmployeeStatus] Nessun targetUserId');
        return {
          canCheckIn: false,
          canCheckOut: false,
          currentStatus: 'available',
          blockingReasons: ['Utente non autenticato'],
          conflictPriority: 0,
          allowPermissionOverlap: true,
          hasHardBlock: false
        };
      }

      const blockingReasons: string[] = [];
      let currentStatus: EmployeeStatus['currentStatus'] = 'available';
      let statusDetails: EmployeeStatus['statusDetails'] | undefined;
      let conflictPriority = 0;
      let allowPermissionOverlap = true;
      let hasHardBlock = false;

      // PRIORITÀ DEI CONFLITTI:
      // 1. Malattia (priorità 5) - BLOCCA DATE
      // 2. Ferie (priorità 4) - BLOCCA DATE
      // 3. Trasferta (priorità 2) - BLOCCA DATE
      // 4. Permesso (priorità 3) - NON BLOCCA DATE (può sovrapporsi)
      // 5. Già presente (priorità 1) - NON BLOCCA DATE

      // 1. CONTROLLO MALATTIA - Priorità massima, BLOCCA DATE
      const { data: sickLeaves } = await supabase
        .from('sick_leaves')
        .select('*')
        .eq('user_id', targetUserId)
        .lte('start_date', targetDate)
        .gte('end_date', targetDate);

      if (sickLeaves && sickLeaves.length > 0) {
        const sickLeave = sickLeaves[0];
        currentStatus = 'sick';
        conflictPriority = 5;
        allowPermissionOverlap = false;
        hasHardBlock = true;
        blockingReasons.push(`Il dipendente è in malattia dal ${sickLeave.start_date} al ${sickLeave.end_date} (${sickLeave.reference_code || 'Codice non disponibile'})`);
        statusDetails = {
          type: 'Malattia',
          startDate: sickLeave.start_date,
          endDate: sickLeave.end_date,
          notes: `${sickLeave.reference_code || ''} - ${sickLeave.notes || ''}`.trim()
        };
      }

      // 2. CONTROLLO FERIE APPROVATE - Seconda priorità, BLOCCA DATE
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
                allowPermissionOverlap = false;
                hasHardBlock = true;
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

      // 3. CONTROLLO TRASFERTE - Quarta priorità, BLOCCA DATE
      if (conflictPriority < 2) {
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
              conflictPriority = 2;
              allowPermissionOverlap = false;
              hasHardBlock = true;
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

      // 4. CONTROLLO PERMESSI APPROVATI - Terza priorità, NON BLOCCA DATE
      let hasHourlyPermission = false;
      let isPermissionExpired = false;
      let canSecondCheckIn = false;
      let permissionEndTime = '';
      let isStartOfDayPermission = false;
      let isMidDayPermission = false;

      if (conflictPriority < 3) {
        const { data: approvedPermissions } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('status', 'approved')
          .eq('type', 'permesso')
          .eq('day', targetDate);

        if (approvedPermissions && approvedPermissions.length > 0) {
          const permission = approvedPermissions[0];
          
          console.log('🔍 Debug permesso trovato:', {
            permission,
            hasTimeFrom: !!permission.time_from,
            hasTimeTo: !!permission.time_to,
            timeFrom: permission.time_from,
            timeTo: permission.time_to,
            type: permission.type,
            day: permission.day,
            timeFromType: typeof permission.time_from,
            timeToType: typeof permission.time_to,
            timeFromLength: permission.time_from?.length,
            timeToLength: permission.time_to?.length,
            condition: `${!!permission.time_from} && ${!!permission.time_to} = ${!!permission.time_from && !!permission.time_to}`
          });
          
          if (permission.time_from && permission.time_to) {
            console.log('✅ Percorso PERMESSO ORARIO');
            // Helper per convertire "HH:mm:ss" in minuti dall'inizio della giornata
            const timeToMinutes = (timeString: string): number => {
              const [hours, minutes] = timeString.split(':').map(Number);
              return hours * 60 + minutes;
            };
            
            // Determina l'orario di inizio lavorativo (personalizzato o aziendale)
            console.log('🔍 Debug work schedules:', {
              employeeWorkSchedule,
              workSchedule,
              employeeWorkScheduleStartTime: employeeWorkSchedule?.start_time,
              workScheduleStartTime: workSchedule?.start_time
            });
            
            const effectiveWorkSchedule = employeeWorkSchedule || workSchedule;
            const workStartTime = effectiveWorkSchedule?.start_time || '08:00:00';
            const workStartMinutes = timeToMinutes(workStartTime);
            
            console.log('🔍 Debug effective work schedule:', {
              effectiveWorkSchedule,
              workStartTime,
              workStartMinutes
            });
            
            // Per permessi orari, controlla se l'orario attuale è dentro il range
            const currentTime = new Date();
            const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
            const permissionStartMinutes = timeToMinutes(permission.time_from);
            const permissionEndMinutes = timeToMinutes(permission.time_to);
            
            const isWithinPermissionTime = currentMinutes >= permissionStartMinutes && 
                                          currentMinutes <= permissionEndMinutes;
            
            // Determina se il permesso è di inizio giornata o in mezzo alla giornata
            // Un permesso è di inizio giornata se inizia entro 1 ora dall'orario di inizio lavorativo
            const oneHourInMinutes = 60;
            const isStartOfDay = permissionStartMinutes <= (workStartMinutes + oneHourInMinutes);
            const isMidDay = !isStartOfDay;
            
            // Imposta i flag per i permessi orari
            hasHourlyPermission = true;
            isPermissionExpired = !isWithinPermissionTime && currentMinutes > permissionEndMinutes;
            // canSecondCheckIn è true SOLO per permessi in mezzo alla giornata E scaduti
            canSecondCheckIn = isPermissionExpired && isMidDay;
            permissionEndTime = permission.time_to;
            isStartOfDayPermission = isStartOfDay;
            isMidDayPermission = isMidDay;
            
            // CORREZIONE: Per permessi di inizio giornata, canSecondCheckIn deve essere sempre false
            if (isStartOfDay) {
              canSecondCheckIn = false;
            }
            
            console.log('🕐 Controllo permesso orario:', {
              currentMinutes,
              permissionStartMinutes,
              permissionEndMinutes,
              workStartMinutes,
              currentTime: format(currentTime, 'HH:mm:ss'),
              permissionStart: permission.time_from,
              permissionEnd: permission.time_to,
              workStartTime,
              isWithinRange: isWithinPermissionTime,
              hasHourlyPermission,
              isPermissionExpired,
              canSecondCheckIn,
              isStartOfDayPermission,
              isMidDayPermission,
              // Debug aggiuntivo per capire il calcolo
              oneHourInMinutes: 60,
              startOfDayThreshold: workStartMinutes + 60,
              isStartOfDayCalculation: `${permissionStartMinutes} <= ${workStartMinutes + 60}`,
              employeeWorkSchedule: employeeWorkSchedule?.start_time,
              companyWorkSchedule: workSchedule?.start_time,
              effectiveWorkSchedule: effectiveWorkSchedule?.start_time,
              // Debug dettagliato per il calcolo
              calculation: {
                permissionStartMinutes,
                workStartMinutes,
                oneHourInMinutes,
                threshold: workStartMinutes + 60,
                isStartOfDay: permissionStartMinutes <= (workStartMinutes + 60),
                isMidDay: !(permissionStartMinutes <= (workStartMinutes + 60))
              }
            });
            
            if (isWithinPermissionTime) {
              // Solo se siamo dentro il range del permesso, blocca
              currentStatus = 'permission';
              conflictPriority = 3;
              blockingReasons.push(`Il dipendente ha un permesso orario attivo dalle ${permission.time_from} alle ${permission.time_to}`);
              statusDetails = {
                type: 'Permesso orario attivo',
                startDate: permission.day,
                timeFrom: permission.time_from,
                timeTo: permission.time_to,
                notes: permission.note || undefined
              };
            } else {
              // Permesso orario scaduto, non bloccare
              console.log('✅ Permesso orario scaduto, check-in permesso');
            }
          } else {
            console.log('✅ Percorso PERMESSO GIORNALIERO');
            // Permesso giornaliero - determina se è di inizio giornata o in mezzo alla giornata
            let isStartOfDayDaily = false;
            let isMidDayDaily = false;
            
            if (permission.time_from) {
              // Se ha un orario di inizio, determina il tipo di permesso
              const permissionStartTime = permission.time_from;
              const permissionStartMinutes = timeToMinutes(permissionStartTime);
              const oneHourInMinutes = 60;
              isStartOfDayDaily = permissionStartMinutes <= (workStartMinutes + oneHourInMinutes);
              isMidDayDaily = !isStartOfDayDaily;
            } else {
              // Se non ha orario di inizio, considera come permesso di inizio giornata
              isStartOfDayDaily = true;
              isMidDayDaily = false;
            }
            
            // Aggiorna i flag globali
            isStartOfDayPermission = isStartOfDayDaily;
            isMidDayPermission = isMidDayDaily;
            
            // Per i permessi giornalieri, considera sempre scaduto dopo l'orario di fine lavoro
            const workEndMinutes = timeToMinutes(workEndTime);
            isPermissionExpired = currentMinutes > workEndMinutes;
            canSecondCheckIn = isPermissionExpired && isMidDayDaily;
            
            // CORREZIONE: Per permessi giornalieri di inizio giornata, canSecondCheckIn deve essere sempre false
            if (isStartOfDayDaily) {
              canSecondCheckIn = false;
            }
            
            // Blocca sempre per tutto il giorno
            currentStatus = 'permission';
            conflictPriority = 3;
            blockingReasons.push('Il dipendente ha un permesso giornaliero per oggi');
            statusDetails = {
              type: 'Permesso giornaliero',
              startDate: permission.day,
              notes: permission.note || undefined
            };
            
            console.log('📅 Controllo permesso giornaliero:', {
              permissionStartTime: permission.time_from,
              workStartTime,
              workEndTime,
              currentTime: format(currentTime, 'HH:mm:ss'),
              isStartOfDayDaily,
              isMidDayDaily,
              isPermissionExpired,
              canSecondCheckIn
            });
          }
        }
      }

      // 5. CONTROLLO PRESENZA GIÀ REGISTRATA - Quinta priorità, NON BLOCCA DATE
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
          // Non impostare conflictPriority per presenza già registrata
          // allowPermissionOverlap rimane true
          // hasHardBlock rimane false
          // Non aggiungere blockingReasons per presenza già registrata
          statusDetails = {
            type: 'Presenza già registrata',
            startDate: targetDate,
            notes: existingAttendance.notes || undefined
          };
        }
      }

      // 6. CONTROLLO RICHIESTE PENDING - Solo avviso, NON BLOCCA
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
      const canCheckIn = !hasHardBlock && blockingReasons.length === 0;
      const canCheckOut = conflictPriority <= 1 && currentStatus === 'already_present';

      return {
        canCheckIn,
        canCheckOut,
        currentStatus,
        blockingReasons,
        statusDetails,
        conflictPriority,
        allowPermissionOverlap,
        hasHardBlock,
        hasHourlyPermission,
        isPermissionExpired,
        canSecondCheckIn,
        permissionEndTime,
        isStartOfDayPermission,
        isMidDayPermission
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
