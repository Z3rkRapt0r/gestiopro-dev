
import { useWorkSchedules } from './useWorkSchedules';
import { useCompanyHolidays } from './useCompanyHolidays';

export const useWorkingDaysValidation = () => {
  const { workSchedule } = useWorkSchedules();
  const { isHoliday } = useCompanyHolidays();

  const isWorkingDay = (date: Date): boolean => {
    if (!workSchedule) return true; // Default: tutti i giorni sono lavorativi se non c'è configurazione
    
    // Controlla se è una festività
    if (isHoliday(date)) return false;
    
    const dayOfWeek = date.getDay();
    switch (dayOfWeek) {
      case 0: return workSchedule.sunday;
      case 1: return workSchedule.monday;
      case 2: return workSchedule.tuesday;
      case 3: return workSchedule.wednesday;
      case 4: return workSchedule.thursday;
      case 5: return workSchedule.friday;
      case 6: return workSchedule.saturday;
      default: return false;
    }
  };

  const countWorkingDays = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      if (isWorkingDay(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  const getWorkingDaysInRange = (startDate: Date, endDate: Date): Date[] => {
    const workingDays: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      if (isWorkingDay(current)) {
        workingDays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  };

  const getWorkingDaysLabels = (): string[] => {
    if (!workSchedule) return [];
    
    const days = [];
    if (workSchedule.monday) days.push('Lunedì');
    if (workSchedule.tuesday) days.push('Martedì');
    if (workSchedule.wednesday) days.push('Mercoledì');
    if (workSchedule.thursday) days.push('Giovedì');
    if (workSchedule.friday) days.push('Venerdì');
    if (workSchedule.saturday) days.push('Sabato');
    if (workSchedule.sunday) days.push('Domenica');
    
    return days;
  };

  return {
    isWorkingDay,
    countWorkingDays,
    getWorkingDaysInRange,
    getWorkingDaysLabels,
    workSchedule
  };
};
