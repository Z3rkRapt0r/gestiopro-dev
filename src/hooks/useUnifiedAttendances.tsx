import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { generateOperationPath, generateReadableId } from '@/utils/italianPathUtils';
import { useEmployeeWorkSchedule } from '@/hooks/useEmployeeWorkSchedule';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';

export interface UnifiedAttendance {
  id: string;
  user_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  is_business_trip: boolean;
  is_manual: boolean;
  is_sick_leave?: boolean; // Temporaneo per compatibilità - usa la tabella sick_leaves
  is_late: boolean;
  late_minutes: number;
  notes?: string | null;
  created_at: string;
  // Nuovi campi per l'organizzazione italiana
  operation_path?: string;
  readable_id?: string;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export const useUnifiedAttendances = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Funzione per calcolare il ritardo per presenze manuali
  const calculateManualLateness = async (checkInTime: string, userId: string, employeeWorkSchedule: any, companyWorkSchedule: any) => {
    // Priorità: orari personalizzati > orari aziendali
    const workSchedule = employeeWorkSchedule || companyWorkSchedule;
    
    if (!workSchedule || !workSchedule.start_time) {
      return { isLate: false, lateMinutes: 0 };
    }

    // Usa sempre la tolleranza degli orari aziendali
    const toleranceMinutes = companyWorkSchedule?.tolerance_minutes || 0;

    // Converte l'orario di check-in in Date
    const checkInDate = new Date(checkInTime);
    const dayOfWeek = checkInDate.getDay();
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

    if (!isWorkingDay) {
      return { isLate: false, lateMinutes: 0 };
    }

    // --- NOVITÀ: controllo permesso orario approvato ---
    let referenceStartTime = workSchedule.start_time;
    let usedPermission = null;
    try {
      const todayStr = format(checkInDate, 'yyyy-MM-dd');
      const { data: approvedPermissions } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .eq('type', 'permesso')
        .eq('day', todayStr);
      if (approvedPermissions && approvedPermissions.length > 0) {
        // Cerca il permesso orario che copre l'inizio turno
        for (const permission of approvedPermissions) {
          if (permission.time_from && permission.time_to) {
            // Se il check-in è dopo la fine del permesso, usa quella come riferimento
            const [permEndH, permEndM] = permission.time_to.split(':').slice(0,2).map(Number);
            const permEnd = new Date(checkInDate);
            permEnd.setHours(permEndH, permEndM, 0, 0);
            // Se il check-in è dopo la fine del permesso, aggiorna il riferimento
            if (checkInDate >= permEnd) {
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
    const expectedStartTime = new Date(checkInDate);
    expectedStartTime.setHours(startHours, startMinutes, 0, 0);
    
    const toleranceTime = new Date(expectedStartTime);
    toleranceTime.setMinutes(toleranceTime.getMinutes() + toleranceMinutes);

    if (checkInDate > toleranceTime) {
      const lateMinutes = Math.floor((checkInDate.getTime() - toleranceTime.getTime()) / (1000 * 60));
      return { isLate: true, lateMinutes };
    }

    return { isLate: false, lateMinutes: 0 };
  };

  // Funzione per validare lo stato del dipendente prima di inserimenti manuali
  const validateEmployeeStatusForManual = async (userId: string, date: string, isAdmin: boolean) => {
    console.log('🔍 Validazione stato per inserimento manuale:', { userId, date, isAdmin });

    // PRIORITÀ ASSOLUTA: Controllo trasferte approvate
    const { data: approvedBusinessTrips } = await supabase
      .from('business_trips')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved');

    if (approvedBusinessTrips && approvedBusinessTrips.length > 0) {
      for (const trip of approvedBusinessTrips) {
        const checkDate = new Date(date);
        const startDate = new Date(trip.start_date);
        const endDate = new Date(trip.end_date);
        
        if (checkDate >= startDate && checkDate <= endDate) {
          throw new Error(`Conflitto critico: il dipendente è in trasferta a ${trip.destination} dal ${trip.start_date} al ${trip.end_date}. Non è possibile registrare presenze normali durante le trasferte.`);
        }
      }
    }

    // Controllo malattia nella nuova tabella dedicata
    const { data: sickLeave } = await supabase
      .from('sick_leaves')
      .select('*')
      .eq('user_id', userId)
      .lte('start_date', date)
      .gte('end_date', date)
      .single();

    if (sickLeave) {
      throw new Error('Conflitto critico: il dipendente è già registrato come in malattia per questa data');
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
            throw new Error(`Conflitto critico: il dipendente è in ferie dal ${vacation.date_from} al ${vacation.date_to}`);
          }
        }
      }
    }

    // Controllo permessi approvati (solo per non-admin o come avviso per admin)
    const { data: approvedPermissions } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .eq('type', 'permesso')
      .eq('day', date);

    if (approvedPermissions && approvedPermissions.length > 0) {
      const permission = approvedPermissions[0];
      const permissionMessage = permission.time_from && permission.time_to 
        ? `il dipendente ha un permesso orario dalle ${permission.time_from} alle ${permission.time_to}`
        : 'il dipendente ha un permesso giornaliero';
      
      if (!isAdmin) {
        throw new Error(`Conflitto: ${permissionMessage}`);
      } else {
        console.warn(`⚠️ Admin override: ${permissionMessage}`);
      }
    }

    console.log('✅ Validazione per inserimento manuale completata');
  };

  const { data: attendances, isLoading } = useQuery({
    queryKey: ['unified-attendances'],
    queryFn: async () => {
      console.log('Caricamento presenze unificate con struttura italiana...');
      
      let query = supabase
        .from('unified_attendances')
        .select('*')
        .order('date', { ascending: false });

      if (profile?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data: attendanceData, error } = await query;

      if (error) {
        console.error('Errore caricamento unified_attendances:', error);
        throw error;
      }

      let allAttendances = attendanceData || [];

      if (profile?.role === 'admin' && allAttendances.length > 0) {
        const userIds = [...new Set(allAttendances.map(att => att.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Errore caricamento profili:', profilesError);
        }

        allAttendances = allAttendances.map(attendance => ({
          ...attendance,
          profiles: profilesData?.find(profile => profile.id === attendance.user_id) || null
        }));
      }

      console.log('Presenze unificate caricate con struttura italiana:', allAttendances.length);
      return allAttendances as UnifiedAttendance[];
    },
    enabled: !!user && !!profile,
  });

  const createManualAttendance = useMutation({
    mutationFn: async (attendanceData: {
      user_id: string;
      date: string;
      check_in_time: string | null;
      check_out_time: string | null;
      notes: string | null;
    }) => {
      console.log('🔐 CREAZIONE PRESENZA MANUALE con validazione anti-conflitto:', attendanceData);
      
      // VALIDAZIONE ANTI-CONFLITTO PRIORITARIA
      const isAdmin = profile?.role === 'admin';
      await validateEmployeeStatusForManual(
        attendanceData.user_id, 
        attendanceData.date, 
        isAdmin
      );
      
      // Genera il path organizzativo italiano
      const attendanceDate = new Date(attendanceData.date);
      const operationType = 'presenza_manuale';
      const operationPath = await generateOperationPath(operationType, attendanceData.user_id, attendanceDate);
      const readableId = generateReadableId(operationType, attendanceDate, attendanceData.user_id);

      console.log('📋 Path organizzativo italiano generato:', {
        operationPath,
        readableId,
        operationType
      });

      // Calcola il ritardo se c'è un orario di check-in
      let isLate = false;
      let lateMinutes = 0;
      
      if (attendanceData.check_in_time) {
        // Carica gli orari per questo dipendente
        const { data: employeeWorkSchedule } = await supabase
          .from('employee_work_schedules')
          .select('*')
          .eq('employee_id', attendanceData.user_id)
          .maybeSingle();
        
        const { data: companyWorkSchedule } = await supabase
          .from('work_schedules')
          .select('*')
          .maybeSingle();
        
        const { isLate: late, lateMinutes: minutes } = await calculateManualLateness(
          attendanceData.check_in_time, 
          attendanceData.user_id,
          employeeWorkSchedule,
          companyWorkSchedule
        );
        isLate = late;
        lateMinutes = minutes;
      }

      const dataToInsert = {
        user_id: attendanceData.user_id,
        date: attendanceData.date,
        check_in_time: attendanceData.check_in_time,
        check_out_time: attendanceData.check_out_time,
        notes: attendanceData.notes ? `${attendanceData.notes} - ${readableId}` : readableId,
        is_manual: true,
        is_business_trip: false,
        is_late: isLate,
        late_minutes: lateMinutes,
        created_by: user?.id,
      };

      console.log('💾 Dati che verranno inseriti nel database con validazione:', dataToInsert);

      const { data, error } = await supabase
        .from('unified_attendances')
        .upsert(dataToInsert, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ ERRORE SUPABASE durante il salvataggio:', error);
        throw error;
      }

      console.log('✅ SUCCESSO - Presenza salvata con validazione anti-conflitto:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      queryClient.invalidateQueries({ queryKey: ['employee-status'] });
      console.log('✅ SUCCESS CALLBACK - Presenza salvata con validazione anti-conflitto');
      toast({
        title: "Presenza salvata",
        description: "La presenza manuale è stata registrata con controlli anti-conflitto incluse le trasferte",
      });
    },
    onError: (error: any) => {
      console.error('❌ Errore creazione presenza manuale:', error);
      toast({
        title: "Presenza non consentita",
        description: error.message || "Errore nella registrazione della presenza",
        variant: "destructive",
      });
    },
  });

  const deleteAttendance = useMutation({
    mutationFn: async (attendance: UnifiedAttendance) => {
      console.log('🗑️ Eliminando presenza dalla struttura italiana:', attendance);
      
      const { error: unifiedError } = await supabase
        .from('unified_attendances')
        .delete()
        .eq('id', attendance.id);

      if (unifiedError) throw unifiedError;

      if (!attendance.is_manual) {
        const { error: attendanceError } = await supabase
          .from('attendances')
          .delete()
          .eq('user_id', attendance.user_id)
          .eq('date', attendance.date);

        if (attendanceError) {
          console.warn('⚠️ Errore eliminazione da attendances (non bloccante):', attendanceError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      queryClient.invalidateQueries({ queryKey: ['employee-status'] });
      toast({
        title: "Presenza eliminata",
        description: "La presenza è stata eliminata dalla struttura organizzativa italiana",
      });
    },
    onError: (error: any) => {
      console.error('❌ Errore eliminazione presenza:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nell'eliminazione della presenza",
        variant: "destructive",
      });
    },
  });

  return {
    attendances,
    isLoading,
    createManualAttendance: createManualAttendance.mutate,
    isCreating: createManualAttendance.isPending,
    deleteAttendance: deleteAttendance.mutate,
    isDeleting: deleteAttendance.isPending,
  };
};
