
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, isValid, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

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
  // Overtime data
  overtime_hours?: number | null;
  overtime_notes?: string | null;
  // NUOVO: Stato di presenza calcolato considerando orari personalizzati
  attendance_status?: string;
  day_name?: string; // Added for day name
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

// Helper: determine if the day is a pure absence (no justification)
const isPureAbsenceDay = (att: AttendanceData): boolean => {
  return getAttendanceStatus(att) === 'Assente';
};

// Helper: determine if the day is a permission day
const isPermissionDay = (att: AttendanceData): boolean => {
  return !!(att.permission_leave && (att.permission_leave.time_from || att.permission_leave.time_to));
};

// Helper: determine if the day is a vacation day (only for working days)
const isVacationDay = (att: AttendanceData, workSchedule?: any, isHoliday?: (date: Date) => boolean): boolean => {
  if (!att.vacation_leave) return false;
  
  // If no work schedule or holiday check provided, assume it's a vacation day
  if (!workSchedule || !isHoliday) return true;
  
  // Check if the day is a working day and not a holiday
  const date = parseISO(att.date);
  const isWorkingDay = checkIfWorkingDay(date, workSchedule);
  const isHolidayDay = isHoliday(date);
  
  // Only consider it a vacation day if it's a working day and not a holiday
  return isWorkingDay && !isHolidayDay;
};

// Helper: check if a date is a working day
const checkIfWorkingDay = (date: Date, workSchedule: any): boolean => {
  if (!workSchedule) return true;
  
  const dayOfWeek = date.getDay();
  
  if ('work_days' in workSchedule) {
    // Employee work schedule: work_days is an array of strings
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayNames[dayOfWeek];
    return workSchedule.work_days.includes(currentDayName);
  } else {
    // Company work schedule: use boolean properties
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

// Helper: add company logo to PDF header
const addCompanyLogo = async (doc: jsPDF, logoUrl: string | null): Promise<number> => {
  console.log('Tentativo di caricare logo:', logoUrl);
  
  // Se non c'è logo URL, crea un logo di test
  if (!logoUrl) {
    console.log('Nessun logo URL fornito - creando logo di test');
    return createTestLogo(doc);
  }
  
  try {
    // Fetch the logo image
    console.log('Fetching logo from:', logoUrl);
    const response = await fetch(logoUrl);
    if (!response.ok) {
      console.warn('Impossibile caricare il logo:', logoUrl, 'Status:', response.status);
      return createTestLogo(doc);
    }
    
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Get image dimensions and calculate size
    const img = new Image();
    img.src = `data:image/png;base64,${base64}`;
    
    // Wait for image to load
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    
    // Calculate logo size (max 15px height, maintain aspect ratio)
    const maxHeight = 15;
    const aspectRatio = img.width / img.height;
    const logoHeight = Math.min(maxHeight, img.height);
    const logoWidth = logoHeight * aspectRatio;
    
    // Center the logo horizontally
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoX = (pageWidth - logoWidth) / 2;
    
    // Add logo to current page
    console.log('Aggiungendo logo al PDF:', { logoX, logoY: 10, logoWidth, logoHeight });
    doc.addImage(`data:image/png;base64,${base64}`, 'PNG', logoX, 10, logoWidth, logoHeight);
    console.log('Logo aggiunto con successo');
    
    return logoHeight + 8; // Return the height used by logo + spacing
  } catch (error) {
    console.error('Errore nel caricamento del logo:', error);
    return createTestLogo(doc);
  }
};

// Helper: create a test logo when no logo is available
const createTestLogo = (doc: jsPDF): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoWidth = 30;
  const logoHeight = 15;
  const logoX = (pageWidth - logoWidth) / 2;
  
  // Background rectangle
  doc.setFillColor(0, 100, 200);
  doc.setDrawColor(0, 100, 200);
  doc.rect(logoX, 10, logoWidth, logoHeight, 'FD');
  
  // Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('A.L.M.', logoX + 2, 16);
  doc.setFontSize(6);
  doc.text('INFISSI', logoX + 2, 21);
  
  return logoHeight + 8; // 15 + 8 spacing
};

// Helper: load License Global logo from bucket
const loadLicenseGlobalLogo = async (): Promise<{ base64: string; width: number; height: number } | null> => {
  try {
    console.log('Tentativo di caricare logo License Global...');
    
    // Prova diversi percorsi possibili
    const possiblePaths = [
      'LicenseGlobal/logo.png',
      'licenseglobal/logo.png',
      'License Global/logo.png',
      'logo-license-global/logo.png'
    ];
    
    let logoData = null;
    
    for (const path of possiblePaths) {
      console.log(`Tentativo percorso: ${path}`);
      
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(path);
      
      console.log(`URL generato per ${path}:`, publicUrl);
      
      if (!publicUrl) {
        console.log(`Nessun URL pubblico per ${path}`);
        continue;
      }
      
      try {
        const response = await fetch(publicUrl);
        console.log(`Response per ${path}:`, response.status, response.statusText);
        
        if (!response.ok) {
          console.log(`Errore nel fetch per ${path}:`, response.status);
          continue;
        }
        
        // Usa direttamente l'URL invece di convertire in base64
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = publicUrl;
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        
        // Calcola dimensioni del logo (max 10px di altezza)
        const maxHeight = 10;
        const aspectRatio = img.width / img.height;
        const logoHeight = Math.min(maxHeight, img.height);
        const logoWidth = logoHeight * aspectRatio;
        
        console.log(`Logo caricato con successo da ${path}:`, { width: logoWidth, height: logoHeight });
        
        logoData = { url: publicUrl, width: logoWidth, height: logoHeight };
        break; // Trovato il logo, esci dal loop
        
      } catch (pathError) {
        console.log(`Errore nel caricamento da ${path}:`, pathError);
        continue;
      }
    }
    
    if (!logoData) {
      console.log('Nessun logo trovato in nessun percorso');
      return null;
    }
    
    return logoData;
  } catch (error) {
    console.error('Errore generale nel caricamento del logo License Global:', error);
    return null;
  }
};

// Helper: add footer with License Global logo (sincrono)
const addFooter = (doc: jsPDF, logoData?: { url: string; width: number; height: number } | null) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  console.log('Aggiungendo footer, logo data:', logoData ? 'presente' : 'assente');
  
  if (logoData && logoData.url) {
    try {
      // Testo "Powered by"
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      const poweredByText = 'Powered by';
      const textWidth = doc.getTextWidth(poweredByText);
      
      // Posiziona il testo e il logo centrati
      const totalWidth = textWidth + 3 + logoData.width; // 3px di spazio tra testo e logo
      const startX = (pageWidth - totalWidth) / 2;
      const y = pageHeight - 15; // 15px dal fondo
      
      // Disegna il testo
      doc.text(poweredByText, startX, y);
      
      // Disegna il logo allineato orizzontalmente al centro con il testo
      const logoX = startX + textWidth + 3;
      const logoY = y - (logoData.height / 2); // Centrato verticalmente con il testo
      doc.addImage(logoData.url, 'PNG', logoX, logoY, logoData.width, logoData.height);
      
      // Aggiungi link cliccabile al logo
      doc.link(logoX, logoY, logoData.width, logoData.height, { url: 'https://licenseglobal.it/' });
      
      console.log('Footer con logo cliccabile aggiunto:', { startX, y, logoX, logoY, logoWidth: logoData.width, logoHeight: logoData.height });
    } catch (error) {
      console.error('Errore nel disegnare il footer con logo:', error);
      // Fallback al testo semplice
      const footerText = 'Powered by [logo.png]';
      const textWidth = doc.getTextWidth(footerText);
      const x = (pageWidth - textWidth) / 2;
      const y = pageHeight - 10;
      doc.text(footerText, x, y);
    }
  } else {
    // Fallback al testo se il logo non è disponibile
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    const footerText = 'Powered by [logo.png]';
    const textWidth = doc.getTextWidth(footerText);
    const x = (pageWidth - textWidth) / 2;
    const y = pageHeight - 10;
    doc.text(footerText, x, y);
    console.log('Footer solo testo aggiunto:', { x, y });
  }
};

interface ExportParams {
  data: AttendanceData[];
  dateFrom: Date;
  dateTo: Date;
  exportType: 'general' | 'operator';
  selectedEmployee?: EmployeeData | null;
  attendanceSettings?: AttendanceSettings | null;
  companyLogoUrl?: string | null;
  workSchedule?: any;
  isHoliday?: (date: Date) => boolean;
  includeLegend?: boolean;
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
  
  console.log('safeFormatTime input:', timeStr, typeof timeStr);
  
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
    
    console.warn('Unable to parse time:', timeStr);
    return '';
  } catch (error) {
    console.error('Error formatting time:', error, timeStr);
    return '';
  }
};

// Funzione per ottenere la visualizzazione degli orari di timbratura
const getAttendanceTimeDisplay = (att: AttendanceData, attendanceSettings?: AttendanceSettings | null) => {
  console.log('getAttendanceTimeDisplay - att:', {
    check_in_time: att.check_in_time,
    check_out_time: att.check_out_time,
    is_late: att.is_late,
    employee_name: att.employee_name
  });
  console.log('getAttendanceTimeDisplay - settings:', attendanceSettings);
  
  // Se è assenza per ferie, malattia, trasferta o permesso, non mostrare orari
  if (att.is_sick_leave || att.is_business_trip || att.vacation_leave || 
      (att.permission_leave && !att.permission_leave.time_from && !att.permission_leave.time_to)) {
    console.log('Skipping time display for absence type');
    return '';
  }
  
  const checkInTime = safeFormatTime(att.check_in_time);
  const checkOutTime = safeFormatTime(att.check_out_time);
  const lateIndicator = att.is_late ? ' (in ritardo)' : '';
  
  console.log('Formatted times:', { checkInTime, checkOutTime, lateIndicator });
  
  if (!checkInTime && !checkOutTime) {
    console.log('No check-in or check-out time available');
    return '';
  }
  
  // Se checkout è disabilitato, mostra solo check-in
  if (attendanceSettings?.checkout_enabled === false) {
    const result = checkInTime ? `${checkInTime}${lateIndicator}` : '';
    console.log('Checkout disabled, returning:', result);
    return result;
  }
  
  // Se checkout è abilitato, mostra entrambi se disponibili
  if (checkInTime && checkOutTime) {
    const result = `${checkInTime}-${checkOutTime}${lateIndicator}`;
    console.log('Both times available, returning:', result);
    return result;
  } else if (checkInTime) {
    const result = `${checkInTime}${lateIndicator}`;
    console.log('Only check-in available, returning:', result);
    return result;
  } else if (checkOutTime) {
    const result = `--:--${checkOutTime}${lateIndicator}`;
    console.log('Only check-out available, returning:', result);
    return result;
  }
  
  console.log('No valid time configuration found');
  return '';
};

// Funzione per determinare lo stato di presenza
const getAttendanceStatus = (att: AttendanceData) => {
  // NUOVO: Se è disponibile lo stato calcolato, usalo MA non per i permessi
  // Per i permessi, calcoliamo sempre dinamicamente per mostrare l'intervallo
  if (att.attendance_status && !att.permission_leave) {
    console.log('Using pre-calculated attendance_status:', att.attendance_status, 'for date:', att.date);
    return att.attendance_status;
  }
  
  // Se c'è un permesso, calcoliamo dinamicamente per mostrare l'intervallo
  if (att.permission_leave) {
    console.log('Calculating permission status dynamically for date:', att.date, 'permission_leave:', att.permission_leave);
  }
  
  // Fallback alla logica originale
  // Priority order: Malattia > Trasferta > Ferie > Permesso + Presenza/Assenza > Presente/Assente
  
  if (att.is_sick_leave) return 'Malattia';
  if (att.is_business_trip) return 'Trasferta';
  
  // Check for vacation
  if (att.vacation_leave) return 'Ferie';
  
  // Debug: Check if permission_leave exists but doesn't match any condition
  if (att.permission_leave) {
    console.log('🔍 Permission leave found but no time match:', {
      date: att.date,
      permission_leave: att.permission_leave,
      time_from: att.permission_leave.time_from,
      time_to: att.permission_leave.time_to,
      hasTimeFrom: !!att.permission_leave.time_from,
      hasTimeTo: !!att.permission_leave.time_to
    });
  }
  
  // Check for permission with time range
  if (att.permission_leave && att.permission_leave.time_from && att.permission_leave.time_to) {
    const hasAttendance = att.check_in_time || att.check_out_time;
    const permissionTime = `${att.permission_leave.time_from.slice(0,5)}-${att.permission_leave.time_to.slice(0,5)}`;
    console.log('🔍 Permission with time range:', {
      date: att.date,
      permission_leave: att.permission_leave,
      time_from: att.permission_leave.time_from,
      time_to: att.permission_leave.time_to,
      permissionTime
    });
    return hasAttendance 
      ? `Presente + Permesso (${permissionTime})`
      : `Assente + Permesso (${permissionTime})`;
  }
  
  // Permission with only start time
  if (att.permission_leave && att.permission_leave.time_from && !att.permission_leave.time_to) {
    const hasAttendance = att.check_in_time || att.check_out_time;
    const permissionTime = `dalle ${att.permission_leave.time_from.slice(0,5)}`;
    return hasAttendance 
      ? `Presente + Permesso (${permissionTime})`
      : `Assente + Permesso (${permissionTime})`;
  }
  
  // Permission with only end time
  if (att.permission_leave && !att.permission_leave.time_from && att.permission_leave.time_to) {
    const hasAttendance = att.check_in_time || att.check_out_time;
    const permissionTime = `fino alle ${att.permission_leave.time_to.slice(0,5)}`;
    return hasAttendance 
      ? `Presente + Permesso (${permissionTime})`
      : `Assente + Permesso (${permissionTime})`;
  }
  
  // Full day permission (no time specified)
  if (att.permission_leave && !att.permission_leave.time_from && !att.permission_leave.time_to) {
    console.log('🔍 Full day permission:', {
      date: att.date,
      permission_leave: att.permission_leave,
      time_from: att.permission_leave.time_from,
      time_to: att.permission_leave.time_to
    });
    return 'Permesso (giornata intera)';
  }
  
  // Regular attendance
  if (att.check_in_time || att.check_out_time) return 'Presente';
  return 'Assente';
};

// Funzione per formattare le ore straordinarie
const getOvertimeDisplay = (overtimeHours: number | null) => {
  if (!overtimeHours || overtimeHours === 0) return '-';
  return `${overtimeHours} ore`;
};

export const generateAttendancePDF = async ({
  data,
  dateFrom,
  dateTo,
  exportType,
  selectedEmployee,
  attendanceSettings,
  companyLogoUrl,
  workSchedule,
  isHoliday,
  includeLegend = true
}: ExportParams) => {
  try {
    console.log('Inizializzazione PDF con dati:', data.length, 'record');
    
    const doc = new jsPDF();
    
    // Configurazione del documento
    doc.setFont('helvetica');
    
    // Aggiungi logo aziendale se disponibile
    console.log('Company logo URL ricevuto:', companyLogoUrl);
    const logoHeight = await addCompanyLogo(doc, companyLogoUrl);
    console.log('Logo height calcolato:', logoHeight);
    
    // Titolo (spostato più in basso se c'è il logo)
    const titleY = logoHeight > 0 ? logoHeight + 15 : 20;
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    const title = exportType === 'general' 
      ? 'Calendario Presenze Generale'
      : `Calendario Presenze - ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`;
    
    doc.text(title, 20, titleY);
    
    // Periodo
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    const periodo = `Periodo: ${format(dateFrom, 'dd/MM/yyyy', { locale: it })} - ${format(dateTo, 'dd/MM/yyyy', { locale: it })}`;
    doc.text(periodo, 20, titleY + 10);
    
    // Data di generazione
    const dataGenerazione = `Generato il: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it })}`;
    doc.text(dataGenerazione, 20, titleY + 20);

    // Legend for colors - compatta e visibile (solo se includeLegend è true)
    let legendY = titleY + 30;
    
    if (includeLegend) {
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.text('LEGENDA:', 20, legendY);
      
      // Prima riga: Assenze e Ferie affiancate
      const firstRowY = legendY + 3;
      const secondRowY = legendY + 15; // Ridotto da 19 a 15 per più spazio
      
      // Red for pure absences - prima colonna
      doc.setFillColor(255, 220, 220);
      doc.setDrawColor(255, 150, 150);
      doc.setLineWidth(0.2);
      doc.rect(20, firstRowY, 6, 6, 'FD');
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Assenze (giornate senza giustificazione)', 30, firstRowY + 5);
      
      // Light blue for vacations - seconda colonna (affianco)
      doc.setFillColor(200, 230, 255);
      doc.setDrawColor(100, 150, 255);
      doc.rect(120, firstRowY, 6, 6, 'FD');
      doc.setTextColor(40, 40, 40);
      doc.text('Ferie (giornate di ferie)', 130, firstRowY + 5);
      
      // Green for permissions - seconda riga
      doc.setFillColor(200, 255, 200);
      doc.setDrawColor(100, 200, 100);
      doc.rect(20, secondRowY, 6, 6, 'FD');
      doc.setTextColor(40, 40, 40);
      doc.text('Permessi (giornate con permesso)', 30, secondRowY + 5);
      
      // Aggiorna legendY per il posizionamento delle tabelle
      legendY = secondRowY + 20; // Spazio dopo la legenda
    } else {
      // Se non c'è legenda, inizia le tabelle più in alto
      legendY = titleY + 20;
    }

    // Reset default text color
    doc.setTextColor(40, 40, 40);
    
    // Pre-carica il logo License Global
    const licenseGlobalLogoData = await loadLicenseGlobalLogo();
    
    // Aggiungi footer alla prima pagina
    addFooter(doc, licenseGlobalLogoData);

    // Se è esportazione generale, dividi per dipendenti
    if (exportType === 'general') {
      // Raggruppa i dati per dipendente e poi per mese
      const employeeGroups = data.reduce((groups, att) => {
        const employeeId = att.user_id;
        if (!groups[employeeId]) {
          groups[employeeId] = {
            employeeName: att.employee_name || 'N/A',
            months: {} as Record<string, AttendanceData[]>
          };
        }
        
        // Raggruppa per mese
        const attDate = parseISO(att.date);
        if (isValid(attDate)) {
          const monthKey = format(attDate, 'yyyy-MM', { locale: it });
          if (!groups[employeeId].months[monthKey]) {
            groups[employeeId].months[monthKey] = [];
          }
          groups[employeeId].months[monthKey].push(att);
        }
        
        return groups;
      }, {} as Record<string, { employeeName: string; months: Record<string, AttendanceData[]> }>);

      // Ordina i dipendenti per nome
      const sortedEmployees = Object.entries(employeeGroups).sort(([,a], [,b]) => 
        a.employeeName.localeCompare(b.employeeName)
      );

      let currentY = legendY + 30; // Ridotto da 35 a 30 per compensare font size più piccolo
      const tableHeaders = [['Data', 'Giorno', 'Stato Presenza', 'Orario Timbratura', 'Straordinari']];

      // Genera una sezione per ogni dipendente
      for (let index = 0; index < sortedEmployees.length; index++) {
        const [employeeId, group] = sortedEmployees[index];
        
        // Se non è il primo dipendente, aggiungi una nuova pagina
        if (index > 0) {
          doc.addPage();
          // Aggiungi logo anche alle pagine successive
          await addCompanyLogo(doc, companyLogoUrl);
          // Aggiungi footer alla nuova pagina
          addFooter(doc, licenseGlobalLogoData);
          currentY = logoHeight > 0 ? logoHeight + 20 : 20;
        }

        // Titolo sezione dipendente
        doc.setFontSize(12); // Ridotto da 16 a 12
        doc.setTextColor(40, 40, 40);
        doc.text(`Dipendente: ${group.employeeName}`, 20, currentY);
        currentY += 10; // Ridotto da 15 a 10 per spostare tabella più in alto

        // Ordina i mesi cronologicamente
        const sortedMonths = Object.entries(group.months).sort(([a], [b]) => a.localeCompare(b));

        // Genera una tabella per ogni mese del dipendente
        for (let monthIndex = 0; monthIndex < sortedMonths.length; monthIndex++) {
          const [monthKey, monthRecords] = sortedMonths[monthIndex];
          
          // Controlla se c'è spazio sufficiente per la tabella, altrimenti nuova pagina
          const estimatedTableHeight = monthRecords.length * 4 + 15; // Stima altezza tabella ridotta
          if (currentY + estimatedTableHeight > 280) { // 280 è l'altezza utile della pagina (aumentata)
            doc.addPage();
            // Aggiungi logo anche alle pagine successive
            await addCompanyLogo(doc, companyLogoUrl);
            // Aggiungi footer alla nuova pagina
            addFooter(doc, licenseGlobalLogoData);
            currentY = logoHeight > 0 ? logoHeight + 20 : 20;
          } else if (monthIndex > 0) {
            // Solo un piccolo spazio tra le tabelle dello stesso dipendente
            currentY += 3;
          }

          // Titolo mese
          const monthDate = parseISO(monthKey + '-01');
          const monthName = format(monthDate, 'MMMM yyyy', { locale: it });
          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          doc.text(`Mese: ${monthName}`, 20, currentY);
          currentY += 5;

          // Ordina i record del mese per data
          const sortedRecords = monthRecords.sort((a, b) => a.date.localeCompare(b.date));

          // Preparazione dati per la tabella del mese
          const tableData = sortedRecords.map(att => [
            safeFormatDate(att.date),
            att.day_name || '',
            getAttendanceStatus(att),
            getAttendanceTimeDisplay(att, attendanceSettings),
            getOvertimeDisplay(att.overtime_hours)
          ]);

          // Genera tabella per il mese
          autoTable(doc, {
            head: tableHeaders,
            body: tableData,
            startY: currentY,
            didDrawPage: (data) => {
              // Aggiungi footer a ogni pagina (sincrono)
              addFooter(doc, licenseGlobalLogoData);
            },
            styles: {
              fontSize: 7,
              cellPadding: 1,
              lineWidth: 0.1,
            },
            headStyles: {
              fillColor: [41, 128, 185],
              textColor: 255,
              fontStyle: 'bold',
              fontSize: 7,
              cellPadding: 1,
            },
            alternateRowStyles: {
              fillColor: [245, 245, 245],
            },
            columnStyles: {
              0: { cellWidth: 30 }, // Data
              1: { cellWidth: 25 }, // Giorno
              2: { cellWidth: 40 }, // Stato Presenza
              3: { cellWidth: 35 }, // Orario Timbratura
              4: { cellWidth: 30 }, // Straordinari
            },
            tableWidth: 'wrap',
            margin: { top: currentY, left: 20, right: 20 },
            didParseCell: function(data) {
              if (data.section === 'body' && includeLegend) {
                const rowIndex = data.row.index;
                const attendanceRecord = sortedRecords[rowIndex];
                if (attendanceRecord) {
                  // Priorità: assenza pura (rosso) > ferie (celeste) > permesso (verde)
                  if (isPureAbsenceDay(attendanceRecord)) {
                    data.cell.styles.fillColor = [255, 220, 220];
                  } else if (isVacationDay(attendanceRecord, workSchedule, isHoliday)) {
                    data.cell.styles.fillColor = [200, 230, 255];
                  } else if (isPermissionDay(attendanceRecord)) {
                    data.cell.styles.fillColor = [200, 255, 200];
                  }
                }
              }
            },
          });

          // Aggiorna la posizione Y per il prossimo elemento
          currentY = (doc as any).lastAutoTable?.finalY || currentY + 30;
        }
        
        // Aggiungi statistiche del dipendente (solo straordinari se presenti)
        const totalOvertime = Object.values(group.months).flat().reduce((sum, att) => sum + (att.overtime_hours || 0), 0);
        if (totalOvertime > 0) {
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`Straordinari totali: ${totalOvertime.toFixed(1)} ore`, 20, currentY + 3);
          currentY += 6;
        }
      }
    } else {
      // Per esportazione singolo dipendente, mantieni il formato originale
      const singleRecords = data;
      const tableData = singleRecords.map(att => [
        safeFormatDate(att.date),
        att.day_name || '',
        att.employee_name || 'N/A',
        getAttendanceStatus(att),
        getAttendanceTimeDisplay(att, attendanceSettings),
        getOvertimeDisplay(att.overtime_hours)
      ]);
      
      const tableHeaders = [['Data', 'Giorno', 'Nome Dipendente', 'Stato Presenza', 'Orario Timbratura', 'Straordinari']];
      
      autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: legendY + 25,
        didDrawPage: (data) => {
          // Aggiungi footer a ogni pagina (sincrono)
          addFooter(doc, licenseGlobalLogoData);
        },
        styles: {
          fontSize: 7,
          cellPadding: 1,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { cellWidth: 22 }, // Data
          1: { cellWidth: 22 }, // Giorno
          2: { cellWidth: 38 }, // Nome Dipendente
          3: { cellWidth: 38 }, // Stato Presenza
          4: { cellWidth: 30 }, // Orario Timbratura
          5: { cellWidth: 25 }, // Straordinari
        },
        tableWidth: 'wrap',
        didParseCell: function(data) {
          if (data.section === 'body' && includeLegend) {
            const rowIndex = data.row.index;
            const attendanceRecord = singleRecords[rowIndex];
            if (attendanceRecord) {
              // Priorità: assenza pura (rosso) > ferie (celeste) > permesso (verde)
              if (isPureAbsenceDay(attendanceRecord)) {
                data.cell.styles.fillColor = [255, 220, 220];
              } else if (isVacationDay(attendanceRecord, workSchedule, isHoliday)) {
                data.cell.styles.fillColor = [200, 230, 255];
              } else if (isPermissionDay(attendanceRecord)) {
                data.cell.styles.fillColor = [200, 255, 200];
              }
            }
          }
        },
        margin: { top: 65, left: 20, right: 20 },
      });
    }
    
    // Statistiche finali
    if (exportType === 'general') {
      // Per esportazione generale, aggiungi le statistiche finali solo nell'ultima pagina
      const finalY = (doc as any).lastAutoTable?.finalY || 100;
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(`Totale presenze: ${data.length}`, 20, finalY + 15);
      
      const uniqueEmployees = new Set(data.map(att => att.user_id)).size;
      doc.text(`Dipendenti coinvolti: ${uniqueEmployees}`, 20, finalY + 25);
    } else {
      // Per esportazione singolo dipendente, mantieni il formato originale
      const finalY = (doc as any).lastAutoTable?.finalY || 100;
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(`Totale presenze: ${data.length}`, 20, finalY + 15);
    }
    
    // Creazione del nome file
    const fileName = exportType === 'general' 
      ? `presenze_generale_${format(dateFrom, 'yyyy-MM-dd')}_${format(dateTo, 'yyyy-MM-dd')}.pdf`
      : `presenze_${selectedEmployee?.first_name}_${selectedEmployee?.last_name}_${format(dateFrom, 'yyyy-MM-dd')}_${format(dateTo, 'yyyy-MM-dd')}.pdf`;
    
    console.log('Tentativo di salvataggio PDF:', fileName);
    
    // Metodo di download usando il metodo save di jsPDF
    doc.save(fileName);
    
    console.log('PDF scaricato con successo:', fileName);
    
  } catch (error) {
    console.error('Errore dettagliato nella generazione PDF:', error);
    throw new Error(`Errore nella generazione del PDF: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
  }
};
