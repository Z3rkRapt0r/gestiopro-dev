
export const formatTime = (timeString: string | null) => {
  if (!timeString) return '--:--';
  
  if (timeString.match(/^\d{2}:\d{2}$/)) {
    return timeString;
  }
  
  try {
    if (timeString.includes('T')) {
      const [, timePart] = timeString.split('T');
      const [hours, minutes] = timePart.split(':');
      return `${hours}:${minutes}`;
    }
    
    if (timeString.includes(' ')) {
      const [, timePart] = timeString.split(' ');
      const [hours, minutes] = timePart.split(':');
      return `${hours}:${minutes}`;
    }
    
    return timeString;
  } catch (error) {
    console.error('Errore nel parsing del timestamp:', timeString, error);
    return '--:--';
  }
};

export const isWorkingDay = (date: Date, workSchedule: any) => {
  if (!workSchedule) return false;
  
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

// Funzione per calcolare i ritardi nelle presenze manuali
export const calculateManualDelay = (checkInTime: string, date: string, workSchedule: any) => {
  if (!workSchedule || !workSchedule.start_time || !workSchedule.tolerance_minutes || !checkInTime) {
    return { isLate: false, lateMinutes: 0 };
  }

  // Crea un oggetto Date per l'orario di check-in
  const checkInDate = new Date(`${date}T${checkInTime}:00`);
  
  // Verifica se è un giorno lavorativo
  if (!isWorkingDay(checkInDate, workSchedule)) {
    return { isLate: false, lateMinutes: 0 };
  }

  // Calcola l'orario di inizio previsto + tolleranza
  const [startHours, startMinutes] = workSchedule.start_time.split(':').map(Number);
  const expectedStartTime = new Date(checkInDate);
  expectedStartTime.setHours(startHours, startMinutes, 0, 0);
  
  const toleranceTime = new Date(expectedStartTime);
  toleranceTime.setMinutes(toleranceTime.getMinutes() + workSchedule.tolerance_minutes);

  if (checkInDate > toleranceTime) {
    const lateMinutes = Math.floor((checkInDate.getTime() - toleranceTime.getTime()) / (1000 * 60));
    return { isLate: true, lateMinutes };
  }

  return { isLate: false, lateMinutes: 0 };
};

// Funzione per formattare l'avviso di tolleranza
export const getToleranceWarning = (checkInTime: string, date: string, workSchedule: any) => {
  if (!workSchedule || !workSchedule.start_time || !workSchedule.tolerance_minutes || !checkInTime) {
    return null;
  }

  const { isLate, lateMinutes } = calculateManualDelay(checkInTime, date, workSchedule);
  
  if (isLate) {
    return {
      isWarning: true,
      message: `⚠️ Il dipendente risulterebbe in ritardo di ${lateMinutes} minuti (tolleranza: ${workSchedule.tolerance_minutes} min)`
    };
  }

  return null;
};
