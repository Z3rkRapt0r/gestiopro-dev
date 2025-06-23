
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
