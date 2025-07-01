
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

interface ExportParams {
  data: AttendanceData[];
  dateFrom: Date;
  dateTo: Date;
  exportType: 'general' | 'operator';
  selectedEmployee?: EmployeeData | null;
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

// Funzione per formattare gli orari in modo sicuro
const safeFormatTime = (timeStr: string | null) => {
  if (!timeStr) return '';
  try {
    // Se è già in formato HH:mm, restituiscilo così com'è
    if (timeStr.match(/^\d{2}:\d{2}$/)) return timeStr;
    // Se è un datetime ISO, estraete solo l'orario
    const date = parseISO(timeStr);
    if (isValid(date)) {
      return format(date, 'HH:mm');
    }
    return '';
  } catch (error) {
    return '';
  }
};

// Funzione per determinare lo stato base di presenza
const getBaseAttendanceStatus = (att: AttendanceData) => {
  if (att.is_sick_leave) return 'Malattia';
  if (att.is_business_trip) return 'Trasferta';
  if (att.vacation_leave) return 'Ferie';
  
  // Full day permission (rare case)
  if (att.permission_leave && !att.permission_leave.time_from && !att.permission_leave.time_to) {
    return 'Permesso';
  }
  
  // Regular attendance
  if (att.check_in_time || att.check_out_time) return 'Presente';
  return 'Assente';
};

// Funzione per ottenere l'orario di timbratura
const getAttendanceTimeRange = (att: AttendanceData) => {
  const checkIn = safeFormatTime(att.check_in_time);
  const checkOut = safeFormatTime(att.check_out_time);
  
  if (checkIn && checkOut) return `${checkIn}-${checkOut}`;
  if (checkIn) return `${checkIn}-`;
  if (checkOut) return `-${checkOut}`;
  return '';
};

// Funzione per ottenere l'orario del permesso
const getPermissionTimeRange = (att: AttendanceData) => {
  console.log('🔍 Debug permesso per data:', att.date, 'permission_leave:', att.permission_leave);
  
  if (att.permission_leave) {
    // Se ha orari specifici
    if (att.permission_leave.time_from && att.permission_leave.time_to) {
      const timeFrom = safeFormatTime(att.permission_leave.time_from);
      const timeTo = safeFormatTime(att.permission_leave.time_to);
      console.log('📅 Permesso con orari:', timeFrom, '-', timeTo);
      return `${timeFrom}-${timeTo}`;
    }
    // Se è un permesso dell'intera giornata (senza orari)
    else {
      console.log('📅 Permesso intera giornata');
      return 'Intera giornata';
    }
  }
  return '';
};

export const generateAttendanceExcel = async ({
  data,
  dateFrom,
  dateTo,
  exportType,
  selectedEmployee
}: ExportParams) => {
  const headers = ['Data', 'Nome Dipendente', 'Stato Presenza', 'Orario Timbratura', 'Permesso'];
  
  const csvData = data.map(att => [
    safeFormatDate(att.date),
    att.employee_name,
    getBaseAttendanceStatus(att),
    getAttendanceTimeRange(att),
    getPermissionTimeRange(att)
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
