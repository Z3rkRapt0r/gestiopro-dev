
import { useState, useEffect } from 'react';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useWorkingDaysTracking } from '@/hooks/useWorkingDaysTracking';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';

export const useDailyAttendanceLogic = (selectedDate: Date | undefined) => {
  const { attendances, isLoading } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const { shouldTrackEmployeeOnDate } = useWorkingDaysTracking();
  const { leaveRequests } = useLeaveRequests();
  const [relevantEmployeesForDate, setRelevantEmployeesForDate] = useState<any[]>([]);

  const selectedDateStr = selectedDate?.toISOString().split('T')[0];
  const selectedDateAttendances = attendances?.filter(att => att.date === selectedDateStr) || [];

  const getRelevantEmployeesForDate = async (dateStr: string) => {
    if (!employees) return [];
    
    const relevantEmployees = [];
    for (const emp of employees) {
      const shouldTrack = await shouldTrackEmployeeOnDate(emp.id, dateStr);
      if (shouldTrack) {
        relevantEmployees.push(emp);
      }
    }
    return relevantEmployees;
  };

  useEffect(() => {
    if (selectedDateStr) {
      getRelevantEmployeesForDate(selectedDateStr).then(setRelevantEmployeesForDate);
    }
  }, [selectedDateStr, employees]);

  // Get employees on leave for the selected date
  const employeesOnLeave = relevantEmployeesForDate.filter(employee => {
    if (!leaveRequests) return false;
    
    return leaveRequests.some(request => {
      if (request.status !== 'approved' || request.user_id !== employee.id) return false;
      
      // Handle vacations (with date_from and date_to)
      if (request.type === 'ferie' && request.date_from && request.date_to) {
        return selectedDateStr >= request.date_from && selectedDateStr <= request.date_to;
      }
      
      // Handle daily permits (with day)
      if (request.type === 'permesso' && request.day && !request.time_from && !request.time_to) {
        return selectedDateStr === request.day;
      }
      
      return false;
    });
  });

  // Get present employees
  const presentEmployees = selectedDateAttendances
    .filter(att => att.check_in_time)
    .map(att => {
      const employee = relevantEmployeesForDate.find(emp => emp.id === att.user_id);
      return employee ? {
        ...employee,
        check_in_time: att.check_in_time,
        check_out_time: att.check_out_time,
        is_business_trip: att.is_business_trip,
        is_sick_leave: att.is_sick_leave,
        is_manual: att.is_manual,
        is_late: att.is_late,
        late_minutes: att.late_minutes,
        notes: att.notes
      } : null;
    })
    .filter(emp => emp !== null);

  // Get absent employees (excluding those on leave and those present)
  const absentEmployees = relevantEmployeesForDate.filter(emp => {
    const hasAttendance = selectedDateAttendances.some(att => att.user_id === emp.id && att.check_in_time);
    const isOnLeave = employeesOnLeave.some(leaveEmp => leaveEmp.id === emp.id);
    return !hasAttendance && !isOnLeave;
  });

  // Get employees not yet hired for this date
  const notYetHiredEmployees = employees?.filter(emp => 
    selectedDate && emp.hire_date && emp.tracking_start_type === 'from_hire_date' && 
    new Date(selectedDate) < new Date(emp.hire_date)
  ) || [];

  // Get dates with attendance for highlighting in calendar
  const datesWithAttendance = attendances?.filter(att => att.check_in_time).map(att => new Date(att.date)) || [];

  return {
    isLoading,
    presentEmployees,
    employeesOnLeave,
    absentEmployees,
    notYetHiredEmployees,
    datesWithAttendance,
    selectedDateStr
  };
};
