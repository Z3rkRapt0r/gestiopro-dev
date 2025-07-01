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
  
  // Check if not yet hired
  if (employee.tracking_start_type === 'from_hire_date' && employee.hire_date) {
    const hireDate = new Date(employee.hire_date);
    if (date < hireDate) {
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