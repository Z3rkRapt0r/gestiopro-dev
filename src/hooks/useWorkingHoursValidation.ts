
import { useWorkSchedules } from './useWorkSchedules';

export interface WorkingHoursValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const useWorkingHoursValidation = () => {
  const { workSchedule } = useWorkSchedules();

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
    })();

    if (!isWorkingDay) {
      const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
      errors.push(`${dayNames[dayOfWeek]} non è un giorno lavorativo secondo la configurazione aziendale`);
    }

    // Verifica orari
    if (timeFrom && timeTo) {
      const workStart = workSchedule.start_time;
      const workEnd = workSchedule.end_time;

      if (timeFrom < workStart) {
        errors.push(`L'orario di inizio (${timeFrom}) deve essere dopo l'inizio dell'orario di lavoro (${workStart})`);
      }

      if (timeTo > workEnd) {
        errors.push(`L'orario di fine (${timeTo}) deve essere prima della fine dell'orario di lavoro (${workEnd})`);
      }

      if (timeFrom >= timeTo) {
        errors.push(`L'orario di fine deve essere successivo all'orario di inizio`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const getWorkingHoursInfo = () => {
    if (!workSchedule) return null;

    const workingDays = [];
    if (workSchedule.monday) workingDays.push('Lun');
    if (workSchedule.tuesday) workingDays.push('Mar');
    if (workSchedule.wednesday) workingDays.push('Mer');
    if (workSchedule.thursday) workingDays.push('Gio');
    if (workSchedule.friday) workingDays.push('Ven');
    if (workSchedule.saturday) workingDays.push('Sab');
    if (workSchedule.sunday) workingDays.push('Dom');

    return {
      workingDays: workingDays.join(', '),
      workingHours: `${workSchedule.start_time} - ${workSchedule.end_time}`,
      toleranceMinutes: workSchedule.tolerance_minutes
    };
  };

  return {
    validatePermissionTime,
    getWorkingHoursInfo,
    workSchedule
  };
};
