import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useActiveEmployees, type Employee } from '@/hooks/useActiveEmployees';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { isEmployeeWorkingDay } from '@/utils/employeeStatusUtils';

export interface DailyAttendanceSummary {
  employee: Employee;
  status: 'present' | 'absent' | 'justified';
  justification?: 'business_trip' | 'vacation' | 'sick_leave' | 'non_working_day';
  details?: string;
  attendanceTime?: string;
  isLate?: boolean;
  lateMinutes?: number;
}

export const useTodayAttendanceSummary = () => {
  const { employees } = useActiveEmployees();
  const { workSchedule: companyWorkSchedule } = useWorkSchedules();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['today-attendance-summary', today],
    queryFn: async () => {
      if (!employees || employees.length === 0) return [];

      console.log('Caricamento riepilogo presenze per oggi:', today);
      
      // Ottieni tutte le presenze di oggi
      const { data: todayAttendances } = await supabase
        .from('unified_attendances')
        .select('*')
        .eq('date', today);

      // Ottieni trasferte attive oggi
      const { data: businessTrips } = await supabase
        .from('business_trips')
        .select('*')
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today);

      // Ottieni ferie attive oggi
      const { data: vacations } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('status', 'approved')
        .eq('type', 'ferie')
        .lte('date_from', today)
        .gte('date_to', today);

      // Ottieni malattie attive oggi
      const { data: sickLeaves } = await supabase
        .from('sick_leaves')
        .select('*')
        .lte('start_date', today)
        .gte('end_date', today);

      // Ottieni gli orari personalizzati per tutti i dipendenti
      const { data: employeeWorkSchedules } = await supabase
        .from('employee_work_schedules')
        .select('*');

      // Crea una mappa per accesso rapido agli orari personalizzati
      const employeeWorkSchedulesMap = employeeWorkSchedules?.reduce((acc, schedule) => {
        acc[schedule.employee_id] = schedule;
        return acc;
      }, {} as Record<string, any>) || {};

      const summaryData: DailyAttendanceSummary[] = employees.map(employee => {
        // Controlla presenza
        const attendance = todayAttendances?.find(att => att.user_id === employee.id);
        
        if (attendance && attendance.check_in_time) {
          return {
            employee,
            status: 'present' as const,
            attendanceTime: attendance.check_in_time,
            isLate: attendance.is_late,
            lateMinutes: attendance.late_minutes || 0,
          };
        }

        // Controlla trasferta
        const businessTrip = businessTrips?.find(trip => trip.user_id === employee.id);
        if (businessTrip) {
          return {
            employee,
            status: 'justified' as const,
            justification: 'business_trip' as const,
            details: `Trasferta a ${businessTrip.destination}`,
          };
        }

        // Controlla ferie
        const vacation = vacations?.find(vac => vac.user_id === employee.id);
        if (vacation) {
          return {
            employee,
            status: 'justified' as const,
            justification: 'vacation' as const,
            details: `In ferie dal ${vacation.date_from} al ${vacation.date_to}`,
          };
        }

        // Controlla malattia
        const sickLeave = sickLeaves?.find(sick => sick.user_id === employee.id);
        if (sickLeave) {
          return {
            employee,
            status: 'justified' as const,
            justification: 'sick_leave' as const,
            details: `In malattia${sickLeave.reference_code ? ` (${sickLeave.reference_code})` : ''}`,
          };
        }

        // NUOVO: Verifica se è un giorno lavorativo per questo dipendente specifico
        const employeeWorkSchedule = employeeWorkSchedulesMap[employee.id];
        const isWorkingDayForThisEmployee = isEmployeeWorkingDay(
          new Date(), 
          employeeWorkSchedule, 
          companyWorkSchedule
        );

        // Se non è un giorno lavorativo per questo dipendente, è giustificato
        if (!isWorkingDayForThisEmployee) {
          return {
            employee,
            status: 'justified' as const,
            justification: 'non_working_day' as const,
            details: 'Giorno non lavorativo',
          };
        }

        // Altrimenti è assente
        return {
          employee,
          status: 'absent' as const,
        };
      });

      console.log('Riepilogo presenze generato:', summaryData);
      return summaryData;
    },
    enabled: !!employees && employees.length > 0,
    refetchInterval: 30000, // Aggiorna ogni 30 secondi
  });

  const stats = {
    total: summary?.length || 0,
    present: summary?.filter(s => s.status === 'present').length || 0,
    absent: summary?.filter(s => s.status === 'absent').length || 0,
    justified: summary?.filter(s => s.status === 'justified').length || 0,
    late: summary?.filter(s => s.isLate).length || 0,
  };

  return {
    summary: summary || [],
    stats,
    isLoading,
    isWorkingDay: companyWorkSchedule ? (() => {
      const dayOfWeek = new Date().getDay();
      switch (dayOfWeek) {
        case 0: return companyWorkSchedule.sunday;
        case 1: return companyWorkSchedule.monday;
        case 2: return companyWorkSchedule.tuesday;
        case 3: return companyWorkSchedule.wednesday;
        case 4: return companyWorkSchedule.thursday;
        case 5: return companyWorkSchedule.friday;
        case 6: return companyWorkSchedule.saturday;
        default: return false;
      }
    })() : true,
  };
};