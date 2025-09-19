import { format } from 'date-fns';
import type { EmployeeProfile } from '@/hooks/useActiveEmployees';

export type EmployeeStatus = 
  | 'not_hired_yet'
  | 'present' 
  | 'on_leave'
  | 'absent'
  | 'business_trip'
  | 'sick_leave';

export interface EmployeeStatusResult {
  status: EmployeeStatus;
  displayText: string;
  className: string;
  iconColor: string;
}

export interface StatusCheckParams {
  employee: EmployeeProfile;
  date: Date;
  hasAttendance: boolean;
  isOnApprovedLeave: boolean;
  isOnBusinessTrip: boolean;
  isOnSickLeave?: boolean;
  shouldTrackEmployeeOnDate?: boolean;
}

export const getEmployeeStatusForDate = async (params: StatusCheckParams): Promise<EmployeeStatusResult> => {
  const { employee, date, hasAttendance, isOnApprovedLeave, isOnBusinessTrip, isOnSickLeave = false, shouldTrackEmployeeOnDate } = params;
  
  // Check if not yet hired - normalize dates to compare only day/month/year
  if (employee.tracking_start_type === 'from_hire_date' && employee.hire_date) {
    const hireDate = new Date(employee.hire_date);
    
    // Normalize both dates to midnight for accurate comparison
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const normalizedHireDate = new Date(hireDate.getFullYear(), hireDate.getMonth(), hireDate.getDate());
    
    // Debug logging
    console.log('🔍 DEBUG getEmployeeStatusForDate - Date comparison:', {
      employee: `${employee.first_name} ${employee.last_name}`,
      checkDate: format(normalizedDate, 'yyyy-MM-dd'),
      hireDate: format(normalizedHireDate, 'yyyy-MM-dd'),
      isBeforeHireDate: normalizedDate < normalizedHireDate
    });
    
    // Only show "Non ancora assunto" for dates BEFORE the hire date
    if (normalizedDate < normalizedHireDate) {
      return {
        status: 'not_hired_yet',
        displayText: 'Non ancora assunto',
        className: 'bg-gray-50 border-gray-200 text-gray-600',
        iconColor: 'bg-gray-400'
      };
    }
  }

  // Check for sick leave
  if (isOnSickLeave || (hasAttendance && isOnSickLeave)) {
    return {
      status: 'sick_leave',
      displayText: 'Malattia',
      className: 'bg-red-50 border-red-200 text-red-700',
      iconColor: 'bg-red-500'
    };
  }

  // Check for business trip
  if (isOnBusinessTrip) {
    return {
      status: 'business_trip',
      displayText: 'In Trasferta',
      className: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      iconColor: 'bg-yellow-500'
    };
  }

  // Check for approved leave
  if (isOnApprovedLeave) {
    return {
      status: 'on_leave',
      displayText: 'In Ferie',
      className: 'bg-blue-50 border-blue-200 text-blue-700',
      iconColor: 'bg-blue-500'
    };
  }

  // Check if present
  if (hasAttendance) {
    return {
      status: 'present',
      displayText: 'Presente',
      className: 'bg-green-50 border-green-200 text-green-700',
      iconColor: 'bg-green-500'
    };
  }

  // Default to absent if should be tracked
  const shouldTrack = shouldTrackEmployeeOnDate !== undefined ? shouldTrackEmployeeOnDate : true;
  if (shouldTrack) {
    return {
      status: 'absent',
      displayText: 'Assente',
      className: 'bg-red-50 border-red-200 text-red-700',
      iconColor: 'bg-red-500'
    };
  }

  // Fallback - should not normally reach here
  return {
    status: 'absent',
    displayText: 'Non tracciato',
    className: 'bg-gray-50 border-gray-200 text-gray-600',
    iconColor: 'bg-gray-400'
  };
};

export const formatHireDate = (hireDate: string): string => {
  return format(new Date(hireDate), 'dd/MM/yyyy');
};

// Utility per gli orari personalizzati dei dipendenti
export interface EmployeeWorkSchedule {
  id: string;
  employee_id: string;
  work_days: string[] | null; // Mantenuto per compatibilità temporanea
  start_time: string;
  end_time: string;
  // Nuove colonne booleane
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

/**
 * Determina se un giorno è lavorativo per un dipendente specifico
 * Considera prima gli orari personalizzati, poi quelli aziendali
 */
export const isEmployeeWorkingDay = (
  date: Date, 
  employeeWorkSchedule: EmployeeWorkSchedule | null,
  companyWorkSchedule: any
): boolean => {
  const dayOfWeek = date.getDay();

  console.log(`🔍 [isEmployeeWorkingDay] ${date.toISOString().split('T')[0]} - employeeWorkSchedule:`, employeeWorkSchedule, 'companyWorkSchedule:', companyWorkSchedule);

  // Se il dipendente ha orari personalizzati, usa quelli
  if (employeeWorkSchedule && employeeWorkSchedule.start_time) {
    let result = false;
    switch (dayOfWeek) {
      case 0: result = employeeWorkSchedule.sunday; break;
      case 1: result = employeeWorkSchedule.monday; break;
      case 2: result = employeeWorkSchedule.tuesday; break;
      case 3: result = employeeWorkSchedule.wednesday; break;
      case 4: result = employeeWorkSchedule.thursday; break;
      case 5: result = employeeWorkSchedule.friday; break;
      case 6: result = employeeWorkSchedule.saturday; break;
      default: result = false;
    }
    console.log(`✅ [isEmployeeWorkingDay] Usando orari personalizzati - result:`, result);
    return result;
  }

  // Altrimenti usa gli orari aziendali
  if (companyWorkSchedule) {
    let result = false;
    switch (dayOfWeek) {
      case 0: result = companyWorkSchedule.sunday; break;
      case 1: result = companyWorkSchedule.monday; break;
      case 2: result = companyWorkSchedule.tuesday; break;
      case 3: result = companyWorkSchedule.wednesday; break;
      case 4: result = companyWorkSchedule.thursday; break;
      case 5: result = companyWorkSchedule.friday; break;
      case 6: result = companyWorkSchedule.saturday; break;
      default: result = false;
    }
    console.log(`🏢 [isEmployeeWorkingDay] Usando orari aziendali - result:`, result);
    return result;
  }

  console.log(`❌ [isEmployeeWorkingDay] Nessun orario configurato - default: false`);
  return false;
};

/**
 * Ottiene l'orario di inizio per un dipendente specifico
 */
export const getEmployeeStartTime = (
  employeeWorkSchedule: EmployeeWorkSchedule | null,
  companyWorkSchedule: any
): string | null => {
  if (employeeWorkSchedule?.start_time) {
    return employeeWorkSchedule.start_time;
  }
  
  if (companyWorkSchedule?.start_time) {
    return companyWorkSchedule.start_time;
  }
  
  return null;
};

/**
 * Ottiene l'orario di fine per un dipendente specifico
 */
export const getEmployeeEndTime = (
  employeeWorkSchedule: EmployeeWorkSchedule | null,
  companyWorkSchedule: any
): string | null => {
  if (employeeWorkSchedule?.end_time) {
    return employeeWorkSchedule.end_time;
  }
  
  if (companyWorkSchedule?.end_time) {
    return companyWorkSchedule.end_time;
  }
  
  return null;
};

/**
 * Conta i giorni lavorativi per un dipendente specifico in un range di date
 */
export const countEmployeeWorkingDays = (
  startDate: Date,
  endDate: Date,
  employeeWorkSchedule: EmployeeWorkSchedule | null,
  companyWorkSchedule: any
): number => {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (isEmployeeWorkingDay(current, employeeWorkSchedule, companyWorkSchedule)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

/**
 * Ottiene tutti i giorni lavorativi per un dipendente specifico in un range di date
 */
export const getEmployeeWorkingDaysInRange = (
  startDate: Date,
  endDate: Date,
  employeeWorkSchedule: EmployeeWorkSchedule | null,
  companyWorkSchedule: any
): Date[] => {
  const workingDays: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (isEmployeeWorkingDay(current, employeeWorkSchedule, companyWorkSchedule)) {
      workingDays.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
};