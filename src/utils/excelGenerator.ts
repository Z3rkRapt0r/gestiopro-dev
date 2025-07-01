
import { format, isValid, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface AttendanceData {
  id: string;
  user_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  is_manual: boolean;
  is_business_trip: boolean;
  is_sick_leave: boolean;
  is_late: boolean;
  late_minutes: number;
  notes?: string | null;
  employee_name: string;
  employee_email: string;
  // Enhanced leave data
  leave_requests?: any[];
  vacation_leave?: any;
  permission_leave?: any;
}

interface EmployeeData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface AttendanceSettings {
  checkout_enabled: boolean;
}

interface ExportParams {
  data: AttendanceData[];
  dateFrom: Date;
  dateTo: Date;
  exportType: 'general' | 'operator';
  selectedEmployee?: EmployeeData | null;
  attendanceSettings?: AttendanceSettings | null;
}

// Funzione per formattare in modo sicuro le date
const safeFormatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Data non valida';
  
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (!isValid(date)) return 'Data non valida';
    return format(date, 'dd/MM/yyyy', { locale: it });
  } catch (error) {
    console.error('Errore formattazione data:', error, dateStr);
    return 'Data non valida';
  }
};

// Funzione per formattare in modo sicuro gli orari
const safeFormatTime = (timeStr: string | null) => {
  if (!timeStr) return '';
  
  try {
    // Handle different time formats
    if (typeof timeStr === 'string') {
      // Handle PostgreSQL time format (HH:mm:ss)
      if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
        return timeStr.slice(0, 5); // Return HH:mm
      }
      
      // Handle HH:mm format
      if (/^\d{2}:\d{2}$/.test(timeStr)) {
        return timeStr;
      }
      
      // Handle ISO datetime format
      const date = parseISO(timeStr);
      if (isValid(date)) {
        return format(date, 'HH:mm', { locale: it });
      }
    }
    
    // Fallback for other formats
    const date = new Date(timeStr);
    if (isValid(date)) {
      return format(date, 'HH:mm', { locale: it });
    }
    
    return '';
  } catch (error) {
    return '';
  }
};

// Funzione per ottenere la visualizzazione degli orari di timbratura
const getAttendanceTimeDisplay = (att: AttendanceData, attendanceSettings?: AttendanceSettings | null) => {
  // Se è assenza per ferie, malattia, trasferta o permesso, non mostrare orari
  if (att.is_sick_leave || att.is_business_trip || att.vacation_leave || 
      (att.permission_leave && !att.permission_leave.time_from && !att.permission_leave.time_to)) {
    return '';
  }
  
  const checkInTime = safeFormatTime(att.check_in_time);
  const checkOutTime = safeFormatTime(att.check_out_time);
  const lateIndicator = att.is_late ? ' ⚠️' : '';
  
  if (!checkInTime && !checkOutTime) return '';
  
  // Se checkout è disabilitato, mostra solo check-in
  if (attendanceSettings?.checkout_enabled === false) {
    return checkInTime ? `${checkInTime}${lateIndicator}` : '';
  }
  
  // Se checkout è abilitato, mostra entrambi se disponibili
  if (checkInTime && checkOutTime) {
    return `${checkInTime}-${checkOutTime}${lateIndicator}`;
  } else if (checkInTime) {
    return `${checkInTime}${lateIndicator}`;
  } else if (checkOutTime) {
    return `--:--${checkOutTime}${lateIndicator}`;
  }
  
  return '';
};

// Funzione per determinare lo stato di presenza
const getAttendanceStatus = (att: AttendanceData) => {
  // Priority order: Malattia > Trasferta > Ferie > Permesso + Presenza/Assenza > Presente/Assente
  
  if (att.is_sick_leave) return 'Malattia';
  if (att.is_business_trip) return 'Trasferta';
  
  // Check for vacation
  if (att.vacation_leave) return 'Ferie';
  
  // Check for permission with time range
  if (att.permission_leave && att.permission_leave.time_from && att.permission_leave.time_to) {
    const hasAttendance = att.check_in_time || att.check_out_time;
    const permissionTime = `${att.permission_leave.time_from.slice(0,5)}-${att.permission_leave.time_to.slice(0,5)}`;
    return hasAttendance 
      ? `Presente + Permesso (${permissionTime})`
      : `Assente + Permesso (${permissionTime})`;
  }
  
  // Full day permission (rare case)
  if (att.permission_leave && !att.permission_leave.time_from && !att.permission_leave.time_to) {
    return 'Permesso';
  }
  
  // Regular attendance
  if (att.check_in_time || att.check_out_time) return 'Presente';
  return 'Assente';
};

export const generateAttendanceExcel = async ({
  data,
  dateFrom,
  dateTo,
  exportType,
  selectedEmployee,
  attendanceSettings
}: ExportParams) => {
  const headers = ['Data', 'Nome Dipendente', 'Stato Presenza', 'Orario Timbratura'];
  
  const csvData = data.map(att => [
    safeFormatDate(att.date),
    att.employee_name,
    getAttendanceStatus(att),
    getAttendanceTimeDisplay(att, attendanceSettings)
  ]);
  
  // Aggiungi intestazione informativa
  const infoRows = [
    [exportType === 'general' ? 'Calendario Presenze Generale' : `Calendario Presenze - ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`],
    [`Periodo: ${format(dateFrom, 'dd/MM/yyyy', { locale: it })} - ${format(dateTo, 'dd/MM/yyyy', { locale: it })}`],
    [`Generato il: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it })}`],
    [`Totale presenze: ${data.length}`],
    [''], // Riga vuota
    headers
  ];
  
  const allRows = [...infoRows, ...csvData];
  
  // Converti in CSV
  const csvContent = allRows.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
  
  // Aggiungi BOM per supporto caratteri speciali in Excel
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;
  
  // Crea e scarica il file
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const fileName = exportType === 'general' 
      ? `presenze_generale_${format(dateFrom, 'yyyy-MM-dd')}_${format(dateTo, 'yyyy-MM-dd')}.csv`
      : `presenze_${selectedEmployee?.first_name}_${selectedEmployee?.last_name}_${format(dateFrom, 'yyyy-MM-dd')}_${format(dateTo, 'yyyy-MM-dd')}.csv`;
    
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
