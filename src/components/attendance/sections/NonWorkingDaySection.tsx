import React from 'react';
import { Users } from 'lucide-react';
import { EmployeeProfile } from '@/hooks/useActiveEmployees';
import { isEmployeeWorkingDay } from '@/utils/employeeStatusUtils';
import { useCompanyHolidays } from '@/hooks/useCompanyHolidays';

interface NonWorkingDaySectionProps {
  employees: EmployeeProfile[];
  selectedDate: Date;
  employeeWorkSchedules: { [employeeId: string]: any };
  companyWorkSchedule: any;
}

export default function NonWorkingDaySection({ 
  employees, 
  selectedDate, 
  employeeWorkSchedules, 
  companyWorkSchedule 
}: NonWorkingDaySectionProps) {
  const { isHoliday, getHolidayName } = useCompanyHolidays();
  
  // Verifica se è una festività
  const isHolidayDate = isHoliday(selectedDate);
  const holidayName = getHolidayName(selectedDate);
  
  // Filtra i dipendenti per cui questo giorno non è lavorativo o è una festività
  const nonWorkingEmployees = employees.filter(emp => {
    const employeeWorkSchedule = employeeWorkSchedules[emp.id];
    const isWorkingDay = isEmployeeWorkingDay(selectedDate, employeeWorkSchedule, companyWorkSchedule);
    return !isWorkingDay || isHolidayDate;
  });

  if (nonWorkingEmployees.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-700 text-base mb-3 flex items-center gap-2">
        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
        {isHolidayDate ? 'Festività' : 'Giorno non lavorativo'} ({nonWorkingEmployees.length})
      </h3>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {nonWorkingEmployees.map((employee) => (
          <div key={employee.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm text-gray-700">
                {employee.first_name} {employee.last_name}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {isHolidayDate ? 'Festività' : 'Non lavorativo'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
