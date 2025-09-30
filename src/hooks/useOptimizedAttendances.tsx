import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { generateOperationPath, generateReadableId } from '@/utils/italianPathUtils';
import { useEmployeeWorkSchedule } from '@/hooks/useEmployeeWorkSchedule';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';

// Interfaccia unificata per entrambi i tipi di presenze
export interface OptimizedAttendance {
  id: string;
  user_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  is_manual: boolean;
  is_business_trip: boolean;
  is_sick_leave: boolean;
  is_late: boolean;
  late_minutes: number;
  notes: string | null;
  operation_path: string | null;
  readable_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export const useOptimizedAttendances = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Funzione per calcolare il ritardo per presenze manuali
  const calculateManualLateness = async (checkInTime: string, userId: string, employeeWorkSchedule: any, companyWorkSchedule: any) => {
    const workSchedule = employeeWorkSchedule || companyWorkSchedule;
    
    if (!workSchedule || !workSchedule.start_time) {
      return { isLate: false, lateMinutes: 0 };
    }

    const toleranceMinutes = companyWorkSchedule?.tolerance_minutes || 0;
    const checkInDate = new Date(checkInTime);
    const dayOfWeek = checkInDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    let isWorkingDay = false;
    
    if (employeeWorkSchedule) {
      if (Array.isArray((employeeWorkSchedule as any).work_days)) {
        isWorkingDay = (employeeWorkSchedule as any).work_days.includes(dayName);
      } else {
        isWorkingDay = Boolean((employeeWorkSchedule as any)[dayName]);
      }
    } else if (companyWorkSchedule) {
      isWorkingDay = companyWorkSchedule[dayName as keyof typeof companyWorkSchedule] as boolean;
    }

    if (!isWorkingDay) {
      return { isLate: false, lateMinutes: 0 };
    }

    // Controllo permesso orario approvato
    let referenceStartTime = workSchedule.start_time;
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
        for (const permission of approvedPermissions) {
          if (permission.time_from && permission.time_to) {
            const [permEndH, permEndM] = permission.time_to.split(':').slice(0,2).map(Number);
            const permEnd = new Date(checkInDate);
            permEnd.setHours(permEndH, permEndM, 0, 0);
            if (checkInDate >= permEnd) {
              referenceStartTime = permission.time_to;
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error('Errore controllo permesso orario:', e);
    }

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

    // Controllo trasferte approvate
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

    // Controllo malattia
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

    console.log('✅ Validazione per inserimento manuale completata');
  };

  // Query per ottenere tutte le presenze (automatiche + manuali)
  const { data: attendances, isLoading } = useQuery({
    queryKey: ['optimized-attendances'],
    queryFn: async () => {
      console.log('Caricamento presenze ottimizzate (automatiche + manuali)...');
      
      // Query per presenze automatiche
      let automaticQuery = supabase
        .from('attendances')
        .select('*')
        .order('date', { ascending: false });

      // Query per presenze manuali
      let manualQuery = supabase
        .from('manual_attendances')
        .select('*')
        .order('date', { ascending: false });

      // Se non è admin, mostra solo le proprie presenze
      if (profile?.role !== 'admin') {
        automaticQuery = automaticQuery.eq('user_id', user?.id);
        manualQuery = manualQuery.eq('user_id', user?.id);
      }

      const [automaticResult, manualResult] = await Promise.all([
        automaticQuery,
        manualQuery
      ]);

      if (automaticResult.error) {
        console.error('Errore caricamento presenze automatiche:', automaticResult.error);
        throw automaticResult.error;
      }

      if (manualResult.error) {
        console.error('Errore caricamento presenze manuali:', manualResult.error);
        throw manualResult.error;
      }

      // Combina i risultati
      const automaticAttendances = (automaticResult.data || []).map(att => ({
        ...att,
        is_manual: false,
        notes: null,
        created_by: null
      }));

      const manualAttendances = (manualResult.data || []).map(att => ({
        ...att,
        is_manual: true
      }));

      let allAttendances = [...automaticAttendances, ...manualAttendances];

      // Ordina per data (più recente prima)
      allAttendances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Se è admin, ottieni anche i profili degli utenti
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

      console.log('Presenze ottimizzate caricate:', allAttendances.length);
      return allAttendances as OptimizedAttendance[];
    },
    enabled: !!user && !!profile,
  });

  // Mutazione per creare presenze manuali
  const createManualAttendance = useMutation({
    mutationFn: async (attendanceData: {
      user_id: string;
      date: string;
      check_in_time: string | null;
      check_out_time: string | null;
      notes: string | null;
    }) => {
      console.log('🔐 CREAZIONE PRESENZA MANUALE OTTIMIZZATA:', attendanceData);
      
      // Validazione anti-conflitto
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

      // Calcola il ritardo se c'è un orario di check-in
      let isLate = false;
      let lateMinutes = 0;
      
      if (attendanceData.check_in_time) {
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
        is_late: isLate,
        late_minutes: lateMinutes,
        operation_path: operationPath,
        readable_id: readableId,
        is_sick_leave: false,
        is_business_trip: false,
        created_by: user?.id,
      };

      console.log('💾 Dati che verranno inseriti in manual_attendances:', dataToInsert);

      const { data, error } = await supabase
        .from('manual_attendances')
        .upsert(dataToInsert, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ ERRORE SUPABASE durante il salvataggio:', error);
        throw error;
      }

      console.log('✅ SUCCESSO - Presenza manuale salvata:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['optimized-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['manual-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      console.log('✅ SUCCESS CALLBACK - Presenza manuale salvata');
      toast({
        title: "Presenza salvata",
        description: "La presenza manuale è stata registrata con controlli anti-conflitto",
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

  // Mutazione per eliminare presenze
  const deleteAttendance = useMutation({
    mutationFn: async (attendance: OptimizedAttendance) => {
      console.log('🗑️ Eliminando presenza ottimizzata:', attendance);
      
      if (attendance.is_manual) {
        // Elimina da manual_attendances
        const { error: manualError } = await supabase
          .from('manual_attendances')
          .delete()
          .eq('id', attendance.id);

        if (manualError) throw manualError;
      } else {
        // Elimina da attendances
        const { error: attendanceError } = await supabase
          .from('attendances')
          .delete()
          .eq('id', attendance.id);

        if (attendanceError) throw attendanceError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimized-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['manual-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      toast({
        title: "Presenza eliminata",
        description: "La presenza è stata eliminata con successo",
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
