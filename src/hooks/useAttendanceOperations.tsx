import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useGPSValidation } from './useGPSValidation';
import { useWorkSchedules } from './useWorkSchedules';
import { useEmployeeWorkSchedule } from './useEmployeeWorkSchedule';
import { format } from 'date-fns';
import { generateOperationPath, generateReadableId } from '@/utils/italianPathUtils';

export const useAttendanceOperations = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { validateLocation } = useGPSValidation();
  const { workSchedule: companyWorkSchedule } = useWorkSchedules();
  const { workSchedule: employeeWorkSchedule } = useEmployeeWorkSchedule(user?.id);

  // Funzione per calcolare i ritardi usando orari personalizzati se disponibili
  const calculateLateness = async (checkInTime: Date) => {
    // Priorità: orari personalizzati > orari aziendali
    const workSchedule = employeeWorkSchedule || companyWorkSchedule;
    
    console.log('🔍 Calcolo ritardo con orari:', {
      employeeWorkSchedule: employeeWorkSchedule ? 'Disponibile' : 'Non disponibile',
      companyWorkSchedule: companyWorkSchedule ? 'Disponibile' : 'Non disponibile',
      usedSchedule: employeeWorkSchedule ? 'Personalizzato' : 'Aziendale',
      startTime: workSchedule?.start_time,
      toleranceMinutes: companyWorkSchedule?.tolerance_minutes
    });

    if (!workSchedule || !workSchedule.start_time) {
      console.log('⚠️ Nessun orario disponibile per il calcolo ritardo');
      return { isLate: false, lateMinutes: 0 };
    }

    // Usa sempre la tolleranza degli orari aziendali
    const toleranceMinutes = companyWorkSchedule?.tolerance_minutes || 0;

    const dayOfWeek = checkInTime.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    let isWorkingDay = false;
    
    if (employeeWorkSchedule) {
      // Orari personalizzati: supporta sia schema con array `work_days` sia schema con booleani per giorno
      if (Array.isArray((employeeWorkSchedule as any).work_days)) {
        isWorkingDay = (employeeWorkSchedule as any).work_days.includes(dayName);
      } else {
        isWorkingDay = Boolean((employeeWorkSchedule as any)[dayName]);
      }
    } else if (companyWorkSchedule) {
      // Orari aziendali: usa i booleani
      isWorkingDay = companyWorkSchedule[dayName as keyof typeof companyWorkSchedule] as boolean;
    }

    console.log('📅 Verifica giorno lavorativo:', {
      dayOfWeek,
      dayName,
      isWorkingDay,
      workDays: employeeWorkSchedule?.work_days
    });

    if (!isWorkingDay) {
      console.log('📅 Non è un giorno lavorativo, nessun ritardo');
      return { isLate: false, lateMinutes: 0 };
    }

    // --- NOVITÀ: controllo permesso orario approvato ---
    let referenceStartTime = workSchedule.start_time;
    let usedPermission = null;
    try {
      const todayStr = format(checkInTime, 'yyyy-MM-dd');
      const { data: approvedPermissions } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'approved')
        .eq('type', 'permesso')
        .eq('day', todayStr);
      if (approvedPermissions && approvedPermissions.length > 0) {
        // Cerca il permesso orario che copre l'inizio turno
        for (const permission of approvedPermissions) {
          if (permission.time_from && permission.time_to) {
            // Se il check-in è dopo la fine del permesso, usa quella come riferimento
            const [permEndH, permEndM] = permission.time_to.split(':').slice(0,2).map(Number);
            const permEnd = new Date(checkInTime);
            permEnd.setHours(permEndH, permEndM, 0, 0);
            // Se il check-in è dopo la fine del permesso, aggiorna il riferimento
            if (checkInTime >= permEnd) {
              referenceStartTime = permission.time_to;
              usedPermission = permission;
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error('Errore controllo permesso orario:', e);
    }
    // --- FINE NOVITÀ ---

    // Calcola l'orario di inizio previsto + tolleranza
    const [startHours, startMinutes] = referenceStartTime.split(':').slice(0, 2).map(Number);
    const expectedStartTime = new Date(checkInTime);
    expectedStartTime.setHours(startHours, startMinutes, 0, 0);
    
    const toleranceTime = new Date(expectedStartTime);
    toleranceTime.setMinutes(toleranceTime.getMinutes() + toleranceMinutes);

    console.log('🔧 Parsing orario:', {
      originalStartTime: workSchedule.start_time,
      referenceStartTime,
      parsedHours: startHours,
      parsedMinutes: startMinutes,
      expectedStartTime: expectedStartTime.toTimeString(),
      toleranceTime: toleranceTime.toTimeString(),
      usedPermission
    });

    console.log('⏰ Confronto orari:', {
      checkInTime: checkInTime.toTimeString(),
      expectedStartTime: expectedStartTime.toTimeString(),
      toleranceTime: toleranceTime.toTimeString(),
      toleranceMinutes,
      isLate: checkInTime > toleranceTime
    });

    if (checkInTime > toleranceTime) {
      // Calcola il ritardo rispetto all'orario previsto (NON rispetto alla tolleranza)
      const lateMinutes = Math.floor((checkInTime.getTime() - expectedStartTime.getTime()) / (1000 * 60));
      console.log(`🚨 Ritardo rilevato: ${lateMinutes} minuti (oltre la tolleranza di ${toleranceMinutes} minuti)`);
      return { isLate: true, lateMinutes };
    }

    console.log('✅ Nessun ritardo rilevato (entro la tolleranza)');
    return { isLate: false, lateMinutes: 0 };
  };

  // Funzione per validare lo stato del dipendente prima di procedere
  const validateEmployeeStatus = async (userId: string, date: string) => {
    console.log('🔍 Validazione stato dipendente per:', { userId, date });

    // Controllo malattia dalla nuova tabella sick_leaves
    const { data: sickLeaves } = await supabase
      .from('sick_leaves')
      .select('*')
      .eq('user_id', userId)
      .lte('start_date', date)
      .gte('end_date', date);

    if (sickLeaves && sickLeaves.length > 0) {
      const sickLeave = sickLeaves[0];
      throw new Error(`Non è possibile registrare presenza: il dipendente è in malattia dal ${sickLeave.start_date} al ${sickLeave.end_date} (Codice: ${sickLeave.reference_code || 'N/A'})`);
    }

    // Controllo ferie approvate
    const { data: approvedVacations } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .eq('type', 'ferie');

    if (approvedVacations) {
      for (const vacation of approvedVacations) {
        if (vacation.date_from && vacation.date_to) {
          const checkDate = new Date(date);
          const startDate = new Date(vacation.date_from);
          const endDate = new Date(vacation.date_to);
          
          if (checkDate >= startDate && checkDate <= endDate) {
            throw new Error(`Non è possibile registrare presenza: il dipendente è in ferie dal ${vacation.date_from} al ${vacation.date_to}`);
          }
        }
      }
    }

    // Controllo permessi approvati
    const { data: approvedPermissions } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .eq('type', 'permesso')
      .eq('day', date);

    if (approvedPermissions && approvedPermissions.length > 0) {
      const permission = approvedPermissions[0];
      if (permission.time_from && permission.time_to) {
        // Helper per convertire "HH:mm:ss" in minuti dall'inizio della giornata
        const timeToMinutes = (timeString: string): number => {
          const [hours, minutes] = timeString.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        // Per permessi orari, controlla se l'orario attuale è dentro il range
        const currentTime = new Date();
        const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
        const permissionStartMinutes = timeToMinutes(permission.time_from);
        const permissionEndMinutes = timeToMinutes(permission.time_to);
        
        const isWithinPermissionTime = currentMinutes >= permissionStartMinutes && 
                                      currentMinutes <= permissionEndMinutes;
        
        // Blocca SOLO se è ancora dentro il range del permesso
        if (isWithinPermissionTime) {
          throw new Error(`Non è possibile registrare presenza: il dipendente ha un permesso orario attivo dalle ${permission.time_from} alle ${permission.time_to}`);
        }
        // Se il permesso è scaduto, non bloccare
      } else {
        // Permesso giornaliero - blocca sempre
        throw new Error('Non è possibile registrare presenza: il dipendente ha un permesso giornaliero');
      }
    }

    // Controllo presenza già esistente
    const { data: existingAttendance } = await supabase
      .from('unified_attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('is_sick_leave', false)
      .single();

    if (existingAttendance && !existingAttendance.is_business_trip) {
      throw new Error('Non è possibile registrare presenza: presenza già registrata per questa data');
    }

    console.log('✅ Validazione stato dipendente completata con successo');
    return true;
  };

  const checkInMutation = useMutation({
    mutationFn: async ({ latitude, longitude, isBusinessTrip = false, businessTripId }: { 
      latitude: number; 
      longitude: number; 
      isBusinessTrip?: boolean;
      businessTripId?: string;
    }) => {
      console.log('🔐 Inizio check-in con validazione anti-conflitto:', { latitude, longitude, isBusinessTrip });

      const today = format(new Date(), 'yyyy-MM-dd');
      
      // VALIDAZIONE ANTI-CONFLITTO PRIORITARIA
      await validateEmployeeStatus(user?.id!, today);

      // Validazione GPS
      const gpsValidation = validateLocation(latitude, longitude, isBusinessTrip);
      if (!gpsValidation.isValid) {
        throw new Error(gpsValidation.message || 'Posizione non valida');
      }

      const now = new Date();
      const checkInTime = now.toTimeString().slice(0, 5);
      
      // Calcola ritardo
      const { isLate, lateMinutes } = await calculateLateness(now);
      
      // Genera il path organizzativo italiano
      const operationType = isBusinessTrip ? 'viaggio_lavoro' : 'presenza_normale';
      const operationPath = await generateOperationPath(operationType, user?.id!, now);
      const readableId = generateReadableId(operationType, now, user?.id!);

      console.log('📋 Path organizzativo italiano per check-in:', {
        operationPath,
        readableId,
        operationType,
        isLate,
        lateMinutes
      });
      
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendances')
        .upsert({
          user_id: user?.id,
          date: today,
          check_in_time: now.toISOString(),
          check_in_latitude: latitude,
          check_in_longitude: longitude,
          is_business_trip: isBusinessTrip,
          business_trip_id: businessTripId,
        }, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (attendanceError) throw attendanceError;

      const { data: unifiedData, error: unifiedError } = await supabase
        .from('unified_attendances')
        .upsert({
          user_id: user?.id,
          date: today,
          check_in_time: checkInTime,
          is_manual: false,
          is_business_trip: isBusinessTrip,
          is_late: isLate,
          late_minutes: lateMinutes,
          notes: readableId,
          created_by: user?.id,
        }, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (unifiedError) throw unifiedError;

      console.log('✅ Check-in completato con validazione anti-conflitto');
      return { attendanceData, unifiedData };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['employee-status'] });
      
      const { unifiedData } = data;
      if (unifiedData.is_late) {
        toast({
          title: "Check-in effettuato (IN RITARDO)",
          description: `Sei arrivato con ${unifiedData.late_minutes} minuti di ritardo`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check-in effettuato",
          description: "Il tuo check-in è stato registrato con successo",
        });
      }
    },
    onError: (error: any) => {
      console.error('❌ Check-in error:', error);
      toast({
        title: "Check-in non consentito",
        description: error.message || "Errore durante il check-in",
        variant: "destructive",
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const now = new Date();
      const checkOutTime = now.toTimeString().slice(0, 5);
      
      console.log('🔐 Check-out con validazione');
      
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendances')
        .update({
          check_out_time: now.toISOString(),
          check_out_latitude: latitude,
          check_out_longitude: longitude,
        })
        .eq('user_id', user?.id)
        .eq('date', today)
        .select()
        .single();

      if (attendanceError) throw attendanceError;

      const { data: unifiedData, error: unifiedError } = await supabase
        .from('unified_attendances')
        .update({
          check_out_time: checkOutTime,
        })
        .eq('user_id', user?.id)
        .eq('date', today)
        .select()
        .single();

      if (unifiedError) throw unifiedError;

      console.log('✅ Check-out completato');
      return { attendanceData, unifiedData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['employee-status'] });
      toast({
        title: "Check-out effettuato",
        description: "Il tuo check-out è stato registrato con successo",
      });
    },
    onError: (error: any) => {
      console.error('❌ Check-out error:', error);
      toast({
        title: "Errore",
        description: "Errore durante il check-out",
        variant: "destructive",
      });
    },
  });

        // Nuova funzione per il secondo check-in dopo permesso orario
        const secondCheckInMutation = useMutation({
          mutationFn: async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
            console.log('🔄 Inizio secondo check-in post-permesso:', { latitude, longitude });

            const today = format(new Date(), 'yyyy-MM-dd');
            const now = new Date();
            const checkInTime = now.toTimeString().slice(0, 8); // HH:MM:SS

            // Validazione GPS per la seconda entrata
            const gpsValidation = validateLocation(latitude, longitude, false);
            if (!gpsValidation.isValid) {
              throw new Error(gpsValidation.message || 'Posizione non valida per la seconda entrata');
            }

            // Trova il permesso orario per oggi per ottenere l'ID
            const { data: permission } = await supabase
              .from('leave_requests')
              .select('id')
              .eq('user_id', user?.id)
              .eq('status', 'approved')
              .eq('type', 'permesso')
              .eq('day', today)
              .not('time_from', 'is', null)
              .not('time_to', 'is', null)
              .single();

            // Crea un nuovo record nella tabella multiple_checkins
            const { data: newCheckIn, error: insertError } = await supabase
              .from('multiple_checkins')
              .insert({
                employee_id: user?.id!,
                date: today,
                checkin_time: checkInTime,
                is_second_checkin: true,
                permission_id: permission?.id || null
              })
              .select()
              .single();

            if (insertError) {
              console.error('Errore creazione secondo check-in:', insertError);
              throw new Error('Errore durante la registrazione della seconda entrata');
            }

            console.log('✅ Secondo check-in completato con successo');
            return newCheckIn;
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendances'] });
            queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
            queryClient.invalidateQueries({ queryKey: ['multiple-checkins'] });
            queryClient.invalidateQueries({ queryKey: ['multiple-checkins-today'] });
            queryClient.invalidateQueries({ queryKey: ['employee-status'] });
            toast({
              title: "Seconda Entrata Registrata",
              description: "La seconda entrata è stata registrata con successo",
            });
          },
    onError: (error: any) => {
      console.error('❌ Errore secondo check-in:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la registrazione della seconda entrata",
        variant: "destructive",
      });
    },
  });

  return {
    checkIn: checkInMutation.mutate,
    checkOut: checkOutMutation.mutate,
    secondCheckIn: secondCheckInMutation.mutate, // Nuova funzione
    isCheckingIn: checkInMutation.isPending,
    isCheckingOut: checkOutMutation.isPending,
    isSecondCheckingIn: secondCheckInMutation.isPending, // Nuovo stato
  };
};
