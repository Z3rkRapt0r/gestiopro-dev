import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';

export interface EmployeePunctualityStats {
  employeeId: string;
  firstName: string;
  lastName: string;
  totalDays: number;
  punctualDays: number;
  lateDays: number;
  punctualityPercentage: number;
  averageDelay: number;
}

export interface PunctualityStats {
  period: 'week' | 'month';
  startDate: string;
  endDate: string;
  totalEmployees: number;
  overallStats: {
    totalWorkDays: number;
    punctualDays: number;
    lateDays: number;
    punctualityPercentage: number;
    averageDelay: number;
  };
  byEmployee: EmployeePunctualityStats[];
}

export const usePunctualityStats = (period: 'week' | 'month' = 'week') => {
  const { employees } = useActiveEmployees();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['punctuality-stats', period],
    queryFn: async () => {
      if (!employees || employees.length === 0) return null;

      console.log('Caricamento statistiche puntualità per periodo:', period);
      
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      
      if (period === 'week') {
        startDate = startOfWeek(subWeeks(now, 0), { locale: it });
        endDate = endOfWeek(now, { locale: it });
      } else {
        startDate = startOfMonth(subMonths(now, 0));
        endDate = endOfMonth(now);
      }

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Ottieni tutte le presenze nel periodo
      const { data: attendances, error } = await supabase
        .from('unified_attendances')
        .select(`
          user_id,
          date,
          check_in_time,
          is_late,
          late_minutes
        `)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .not('check_in_time', 'is', null);

      if (error) {
        console.error('Errore caricamento presenze per statistiche:', error);
        throw error;
      }

      // Calcola statistiche per dipendente
      const employeeStats: EmployeePunctualityStats[] = employees.map(employee => {
        const employeeAttendances = attendances?.filter(att => att.user_id === employee.id) || [];
        
        const totalDays = employeeAttendances.length;
        const lateDays = employeeAttendances.filter(att => att.is_late).length;
        const punctualDays = totalDays - lateDays;
        const punctualityPercentage = totalDays > 0 ? (punctualDays / totalDays) * 100 : 0;
        
        const totalLateMinutes = employeeAttendances
          .filter(att => att.is_late)
          .reduce((sum, att) => sum + (att.late_minutes || 0), 0);
        const averageDelay = lateDays > 0 ? totalLateMinutes / lateDays : 0;

        return {
          employeeId: employee.id,
          firstName: employee.first_name || '',
          lastName: employee.last_name || '',
          totalDays,
          punctualDays,
          lateDays,
          punctualityPercentage: Math.round(punctualityPercentage * 100) / 100,
          averageDelay: Math.round(averageDelay * 100) / 100,
        };
      });

      // Calcola statistiche generali
      const totalWorkDays = employeeStats.reduce((sum, emp) => sum + emp.totalDays, 0);
      const totalPunctualDays = employeeStats.reduce((sum, emp) => sum + emp.punctualDays, 0);
      const totalLateDays = employeeStats.reduce((sum, emp) => sum + emp.lateDays, 0);
      const overallPunctualityPercentage = totalWorkDays > 0 ? (totalPunctualDays / totalWorkDays) * 100 : 0;
      
      const totalDelayMinutes = employeeStats.reduce((sum, emp) => 
        sum + (emp.averageDelay * emp.lateDays), 0);
      const overallAverageDelay = totalLateDays > 0 ? totalDelayMinutes / totalLateDays : 0;

      const result: PunctualityStats = {
        period,
        startDate: startDateStr,
        endDate: endDateStr,
        totalEmployees: employees.length,
        overallStats: {
          totalWorkDays,
          punctualDays: totalPunctualDays,
          lateDays: totalLateDays,
          punctualityPercentage: Math.round(overallPunctualityPercentage * 100) / 100,
          averageDelay: Math.round(overallAverageDelay * 100) / 100,
        },
        byEmployee: employeeStats.sort((a, b) => b.punctualityPercentage - a.punctualityPercentage),
      };

      console.log('Statistiche puntualità generate:', result);
      return result;
    },
    enabled: !!employees && employees.length > 0,
    refetchInterval: 300000, // Aggiorna ogni 5 minuti
  });

  return {
    stats,
    isLoading,
  };
};