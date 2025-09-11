
import { useWorkSchedules } from './useWorkSchedules';
import { useEmployeeWorkSchedule } from './useEmployeeWorkSchedule';

export interface WorkingHoursValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const useWorkingHoursValidation = (employeeId?: string) => {
  const { workSchedule: companyWorkSchedule } = useWorkSchedules();
  const { workSchedule: employeeWorkSchedule } = useEmployeeWorkSchedule(employeeId);
  const workSchedule = employeeWorkSchedule || companyWorkSchedule;

  const validatePermissionTime = (
    day: Date,
    timeFrom: string,
    timeTo: string
  ): WorkingHoursValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!workSchedule) {
      warnings.push('Configurazione orari di lavoro non disponibile');
      return { isValid: true, errors, warnings };
    }

    // Verifica se il giorno è lavorativo
    const dayOfWeek = day.getDay();
    const isWorkingDay = (() => {
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
    })();

    if (!isWorkingDay) {
      const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
      errors.push(`${dayNames[dayOfWeek]} non è un giorno lavorativo secondo la configurazione`);
    }

    // Verifica orari
    if (timeFrom && timeTo) {
      const workStart = workSchedule.start_time;
      const workEnd = workSchedule.end_time;

      if (timeFrom < workStart) {
        errors.push(`Orario di inizio non valido: ${timeFrom} è troppo presto. L'orario di lavoro inizia alle ${workStart.substring(0, 5)}`);
      }

      if (timeTo > workEnd) {
        errors.push(`Orario di fine non valido: ${timeTo} è troppo tardi. L'orario di lavoro termina alle ${workEnd.substring(0, 5)}`);
      }

      if (timeFrom > timeTo) {
        errors.push(`L'orario di fine deve essere successivo all'orario di inizio`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  return { validatePermissionTime, workSchedule };
};
