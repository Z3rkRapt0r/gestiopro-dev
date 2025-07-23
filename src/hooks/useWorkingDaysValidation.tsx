
import { useWorkSchedules } from './useWorkSchedules';
import { useEmployeeWorkSchedule } from './useEmployeeWorkSchedule';
import { useCompanyHolidays } from './useCompanyHolidays';

export const useWorkingDaysValidation = (employeeId?: string) => {
  const { workSchedule: companyWorkSchedule } = useWorkSchedules();
  const { workSchedule: employeeWorkSchedule } = useEmployeeWorkSchedule(employeeId);
  const { isHoliday } = useCompanyHolidays();
  const workSchedule = employeeWorkSchedule || companyWorkSchedule;

  const isWorkingDay = (date: Date): boolean => {
    if (!workSchedule) return true;
    if (isHoliday(date)) return false;
    const dayOfWeek = date.getDay();
    if ('work_days' in workSchedule) {
      // employeeWorkSchedule: work_days è un array di string
      const days = workSchedule.work_days;
      const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      return days.includes(dayNames[dayOfWeek]);
    } else {
      // companyWorkSchedule: boolean per ogni giorno
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
    if ('work_days' in workSchedule) {
      const dayLabels = {
        monday: 'Lunedì',
        tuesday: 'Martedì',
        wednesday: 'Mercoledì',
        thursday: 'Giovedì',
        friday: 'Venerdì',
        saturday: 'Sabato',
        sunday: 'Domenica',
      };
      return workSchedule.work_days.map((d: string) => dayLabels[d as keyof typeof dayLabels] || d);
    } else {
      const days = [];
      if (workSchedule.monday) days.push('Lunedì');
      if (workSchedule.tuesday) days.push('Martedì');
      if (workSchedule.wednesday) days.push('Mercoledì');
      if (workSchedule.thursday) days.push('Giovedì');
      if (workSchedule.friday) days.push('Venerdì');
      if (workSchedule.saturday) days.push('Sabato');
      if (workSchedule.sunday) days.push('Domenica');
      return days;
    }
  };

  return {
    isWorkingDay,
    countWorkingDays,
    getWorkingDaysInRange,
    getWorkingDaysLabels,
    workSchedule
  };
};
