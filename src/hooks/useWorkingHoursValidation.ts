
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
        const ws: any = workSchedule as any;
        if (Array.isArray(ws.work_days)) {
          const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
          return ws.work_days.includes(dayNames[dayOfWeek]);
        }
        // Schema con booleani per giorno
        switch (dayOfWeek) {
          case 0: return !!ws.sunday;
          case 1: return !!ws.monday;
          case 2: return !!ws.tuesday;
          case 3: return !!ws.wednesday;
          case 4: return !!ws.thursday;
          case 5: return !!ws.friday;
          case 6: return !!ws.saturday;
          default: return false;
        }
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

      // CONTROLLO PRINCIPALE: orario fine > orario inizio
      if (timeFrom >= timeTo) {
        errors.push(`L'orario di fine deve essere successivo all'orario di inizio`);
      }

      // CONTROLLO: orari entro limiti lavorativi (personalizzati o aziendali)
      if (timeFrom < workStart) {
        errors.push(`L'orario di inizio (${timeFrom}) deve essere dopo l'inizio dell'orario di lavoro (${workStart})`);
      }

      if (timeTo > workEnd) {
        errors.push(`L'orario di fine (${timeTo}) deve essere prima della fine dell'orario di lavoro (${workEnd})`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  // Nuova funzione per validazione completa orari dipendente
  const validateEmployeePermissionTime = (
    day: Date,
    timeFrom: string,
    timeTo: string,
    userId?: string
  ): WorkingHoursValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Usa sempre gli orari specifici del dipendente se disponibili
    const effectiveSchedule = employeeWorkSchedule || companyWorkSchedule;
    
    if (!effectiveSchedule) {
      warnings.push('Configurazione orari di lavoro non disponibile');
      return { isValid: true, errors, warnings };
    }

    // Verifica se il giorno è lavorativo
    const dayOfWeek = day.getDay();
    const isWorkingDay = (() => {
      if ('work_days' in effectiveSchedule) {
        const ws: any = effectiveSchedule as any;
        if (Array.isArray(ws.work_days)) {
          const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
          return ws.work_days.includes(dayNames[dayOfWeek]);
        }
        switch (dayOfWeek) {
          case 0: return !!ws.sunday;
          case 1: return !!ws.monday;
          case 2: return !!ws.tuesday;
          case 3: return !!ws.wednesday;
          case 4: return !!ws.thursday;
          case 5: return !!ws.friday;
          case 6: return !!ws.saturday;
          default: return false;
        }
      } else {
        // companyWorkSchedule: boolean per ogni giorno
        switch (dayOfWeek) {
          case 0: return effectiveSchedule.sunday;
          case 1: return effectiveSchedule.monday;
          case 2: return effectiveSchedule.tuesday;
          case 3: return effectiveSchedule.wednesday;
          case 4: return effectiveSchedule.thursday;
          case 5: return effectiveSchedule.friday;
          case 6: return effectiveSchedule.saturday;
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
      const workStart = effectiveSchedule.start_time;
      const workEnd = effectiveSchedule.end_time;

      // CONTROLLO PRINCIPALE: orario fine > orario inizio
      if (timeFrom >= timeTo) {
        errors.push(`L'orario di fine deve essere successivo all'orario di inizio`);
      }

      // CONTROLLO: orari entro limiti lavorativi
      if (timeFrom < workStart) {
        const scheduleType = employeeWorkSchedule ? 'personalizzati' : 'aziendali generali';
        errors.push(`L'orario di inizio (${timeFrom}) deve essere dopo l'inizio dell'orario di lavoro ${scheduleType} (${workStart})`);
      }

      if (timeTo > workEnd) {
        const scheduleType = employeeWorkSchedule ? 'personalizzati' : 'aziendali generali';
        errors.push(`L'orario di fine (${timeTo}) deve essere prima della fine dell'orario di lavoro ${scheduleType} (${workEnd})`);
      }

      // Controllo durata massima permesso (4 ore)
      const startTime = new Date(`1970-01-01T${timeFrom}:00`);
      const endTime = new Date(`1970-01-01T${timeTo}:00`);
      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      if (durationHours > 4) {
        errors.push(`La durata del permesso non può superare le 4 ore (attualmente: ${durationHours.toFixed(2)} ore)`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  return { validatePermissionTime, validateEmployeePermissionTime, workSchedule };
};
