
import { useCallback } from 'react';
import { useCompanyHolidays } from './useCompanyHolidays';
import { format } from 'date-fns';

export const useAttendanceHolidays = () => {
  const { holidays, isHoliday, getHoliday } = useCompanyHolidays();

  const checkAttendanceHoliday = useCallback(async (date: Date) => {
    const isHolidayDate = isHoliday(date);
    const holiday = getHoliday(date);
    
    return {
      isHoliday: isHolidayDate,
      holiday: holiday,
      message: isHolidayDate 
        ? `Non è possibile registrare presenza il ${format(date, 'dd/MM/yyyy')} (${holiday?.name})` 
        : null
    };
  }, [isHoliday, getHoliday]);

  const getHolidayMessage = useCallback((date: Date) => {
    const holiday = getHoliday(date);
    if (holiday) {
      return `Giorno festivo: ${holiday.name}`;
    }
    return null;
  }, [getHoliday]);

  return {
    holidays,
    isHoliday,
    getHoliday,
    checkAttendanceHoliday,
    getHolidayMessage
  };
};
