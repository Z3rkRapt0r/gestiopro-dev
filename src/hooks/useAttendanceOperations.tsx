
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useGPSValidation } from './useGPSValidation';
import { useWorkSchedules } from './useWorkSchedules';
import { generateOperationPath, generateReadableId } from '@/utils/italianPathUtils';

export const useAttendanceOperations = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { validateLocation } = useGPSValidation();
  const { workSchedule } = useWorkSchedules();

  // Funzione per calcolare i ritardi considerando i permessi approvati
  const calculateLateness = async (checkInTime: Date, workSchedule: any, userId: string) => {
    if (!workSchedule || !workSchedule.start_time || !workSchedule.tolerance_minutes) {
      return { isLate: false, lateMinutes: 0 };
    }

    const dayOfWeek = checkInTime.getDay();
    const isWorkingDay = (() => {
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
    })();

    if (!isWorkingDay) {
      return { isLate: false, lateMinutes: 0 };
    }

    const checkInDate = checkInTime.toISOString().split('T')[0];
    
    // Controlla se ci sono permessi approvati per questa data
    const { data: approvedPermissions } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .eq('type', 'permesso')
      .eq('day', checkInDate);

    let referenceStartTime = workSchedule.start_time;
    
    // Se ci sono permessi orari approvati, trova quello che termina più tardi
    if (approvedPermissions && approvedPermissions.length > 0) {
      const hourlyPermissions = approvedPermissions.filter(p => p.time_from && p.time_to);
      
      if (hourlyPermissions.length > 0) {
        // Trova il permesso che termina più tardi
        const latestPermission = hourlyPermissions.reduce((latest, current) => {
          return current.time_to > latest.time_to ? current : latest;
        });
        
        // Se il permesso termina dopo l'orario di inizio standard, usa quello come riferimento
        if (latestPermission.time_to > workSchedule.start_time) {
          referenceStartTime = latestPermission.time_to;
        }
      }
    }

    // Calcola l'orario di inizio previsto + tolleranza
    const [startHours, startMinutes] = referenceStartTime.split(':').map(Number);
    const expectedStartTime = new Date(checkInTime);
    expectedStartTime.setHours(startHours, startMinutes, 0, 0);
    
    const toleranceTime = new Date(expectedStartTime);
    toleranceTime.setMinutes(toleranceTime.getMinutes() + workSchedule.tolerance_minutes);

    if (checkInTime > toleranceTime) {
      const lateMinutes = Math.floor((checkInTime.getTime() - toleranceTime.getTime()) / (1000 * 60));
      return { isLate: true, lateMinutes };
    }

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

      const today = new Date().toISOString().split('T')[0];
      
      // VALIDAZIONE ANTI-CONFLITTO PRIORITARIA
      await validateEmployeeStatus(user?.id!, today);

      // Validazione GPS
      const gpsValidation = validateLocation(latitude, longitude, isBusinessTrip);
      if (!gpsValidation.isValid) {
        throw new Error(gpsValidation.message || 'Posizione non valida');
      }

      const now = new Date();
      const checkInTime = now.toTimeString().slice(0, 5);
      
      // Calcola ritardo considerando i permessi approvati
      const { isLate, lateMinutes } = await calculateLateness(now, workSchedule, user?.id!);
      
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

      console.log('✅ Check-in completato con validazione anti-conflitto e calcolo ritardo intelligente');
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
      const today = new Date().toISOString().split('T')[0];
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

  return {
    checkIn: checkInMutation.mutate,
    checkOut: checkOutMutation.mutate,
    isCheckingIn: checkInMutation.isPending,
    isCheckingOut: checkOutMutation.isPending,
  };
};
