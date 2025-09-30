
import { useMemo } from 'react';
import { format } from 'date-fns';
import type { UnifiedAttendance } from '@/hooks/useUnifiedAttendances';
import type { EmployeeProfile } from '@/hooks/useActiveEmployees';
import { isEmployeeWorkingDay } from '@/utils/employeeStatusUtils';

interface RealisticAttendanceStats {
  totalWorkingDays: number;
  presentDays: number;
  sickDays: number;
  absentDays: number;
  attendancePercentage: number;
  calculationPeriod: {
    startDate: Date;
    endDate: Date;
    description: string;
  };
  hasValidData: boolean;
  errorMessage?: string;
}

export const useRealisticAttendanceStats = (
  employee: EmployeeProfile | null,
  attendances: UnifiedAttendance[],
  workSchedule: any,
  employeeWorkSchedule?: any
): RealisticAttendanceStats => {
  return useMemo(() => {
    // Validazione iniziale
    if (!employee?.id || !attendances || !workSchedule) {
      return {
        totalWorkingDays: 0,
        presentDays: 0,
        sickDays: 0,
        absentDays: 0,
        attendancePercentage: 0,
        calculationPeriod: {
          startDate: new Date(),
          endDate: new Date(),
          description: 'Periodo non definito'
        },
        hasValidData: false,
        errorMessage: 'Dati mancanti per il calcolo'
      };
    }

    const today = new Date();
    const currentYear = today.getFullYear();

    // Determina la data di inizio calcolo
    let startDate: Date;
    let description: string;

    if (employee.tracking_start_type === 'from_hire_date') {
      if (!employee.hire_date) {
        return {
          totalWorkingDays: 0,
          presentDays: 0,
          sickDays: 0,
          absentDays: 0,
          attendancePercentage: 0,
          calculationPeriod: {
            startDate: new Date(),
            endDate: new Date(),
            description: 'Data di assunzione mancante'
          },
          hasValidData: false,
          errorMessage: 'Data di assunzione non configurata per questo dipendente'
        };
      }

      const hireDate = new Date(employee.hire_date);
      
      // Se assunto dopo oggi, non ha senso calcolare
      if (hireDate > today) {
        return {
          totalWorkingDays: 0,
          presentDays: 0,
          sickDays: 0,
          absentDays: 0,
          attendancePercentage: 0,
          calculationPeriod: {
            startDate: hireDate,
            endDate: today,
            description: 'Data di assunzione futura'
          },
          hasValidData: false,
          errorMessage: 'La data di assunzione è nel futuro'
        };
      }

      const startOfYear = new Date(currentYear, 0, 1);
      startDate = hireDate > startOfYear ? hireDate : startOfYear;
      description = `Dal ${format(startDate, 'dd/MM/yyyy')} (assunzione)`;
    } else {
      startDate = new Date(currentYear, 0, 1);
      description = `Dall'inizio dell'anno ${currentYear}`;
    }

    // Funzione per verificare se un giorno è lavorativo per questo dipendente
    const isWorkingDay = (date: Date): boolean => {
      const result = isEmployeeWorkingDay(date, employeeWorkSchedule, workSchedule);
      console.log(`🔍 [useRealisticAttendanceStats] ${format(date, 'yyyy-MM-dd')} - employeeWorkSchedule:`, employeeWorkSchedule, 'companyWorkSchedule:', workSchedule, 'isWorkingDay:', result);
      return result;
    };

    // Calcola i giorni lavorativi nel periodo
    let totalWorkingDays = 0;
    const tempDate = new Date(startDate);
    
    while (tempDate <= today) {
      if (isWorkingDay(tempDate)) {
        totalWorkingDays++;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // Filtra le presenze nel periodo di calcolo
    const periodAttendances = attendances.filter(att => {
      const attDate = new Date(att.date);
      return attDate >= startDate && attDate <= today;
    });

    // Calcola le statistiche
    const presentDays = periodAttendances.filter(att => 
      att.check_in_time && !att.is_sick_leave
    ).length;
    
    const sickDays = periodAttendances.filter(att => att.is_sick_leave).length;
    
    // Le assenze sono i giorni lavorativi senza presenza registrata
    const absentDays = Math.max(0, totalWorkingDays - periodAttendances.length);
    console.log(`📊 [useRealisticAttendanceStats] Calcolo assenze: totalWorkingDays=${totalWorkingDays}, periodAttendances=${periodAttendances.length}, absentDays=${absentDays}`);
    
    const attendancePercentage = totalWorkingDays > 0 
      ? Math.round((presentDays / totalWorkingDays) * 100) 
      : 0;

    return {
      totalWorkingDays,
      presentDays,
      sickDays,
      absentDays,
      attendancePercentage,
      calculationPeriod: {
        startDate,
        endDate: today,
        description
      },
      hasValidData: true
    };
  }, [employee?.id, employee?.hire_date, employee?.tracking_start_type, attendances, workSchedule, employeeWorkSchedule]);
};
