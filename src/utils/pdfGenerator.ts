
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  // NUOVO: Se è disponibile lo stato calcolato, usalo
  if (att.attendance_status) {
    console.log('Using pre-calculated attendance_status:', att.attendance_status, 'for date:', att.date);
    return att.attendance_status;
  }
  
  // Fallback alla logica originale
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
  attendanceSettings
}: ExportParams) => {
  try {
    console.log('Inizializzazione PDF con dati:', data.length, 'record');
    
    const doc = new jsPDF();
    
    // Configurazione del documento
    doc.setFont('helvetica');
    
    // Titolo
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    const title = exportType === 'general' 
      ? 'Calendario Presenze Generale'
      : `Calendario Presenze - ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`;
    
    doc.text(title, 20, 25);
    
    // Periodo
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    const periodo = `Periodo: ${format(dateFrom, 'dd/MM/yyyy', { locale: it })} - ${format(dateTo, 'dd/MM/yyyy', { locale: it })}`;
    doc.text(periodo, 20, 35);
    
    // Data di generazione
    const dataGenerazione = `Generato il: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it })}`;
    doc.text(dataGenerazione, 20, 45);

    // Legend for colors - migliorata graficamente
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text('LEGENDA', 20, 52);
    
    // Bordo per la legenda
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(18, 45, 160, 20);
    
    // Red for pure absences
    doc.setFillColor(255, 220, 220);
    doc.setDrawColor(255, 150, 150);
    doc.setLineWidth(0.3);
    doc.rect(25, 48, 8, 8, 'FD');
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Assenze', 37, 54);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text('(giornate senza giustificazione)', 37, 58);
    
    // Yellow for late
    doc.setFillColor(255, 245, 157);
    doc.setDrawColor(255, 200, 100);
    doc.rect(25, 60, 8, 8, 'FD');
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Ritardi', 37, 66);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text('(evidenziati in giallo)', 37, 70);

    // Reset default text color
    doc.setTextColor(40, 40, 40);

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

      let currentY = 75;
      const tableHeaders = [['Data', 'Giorno', 'Stato Presenza', 'Orario Timbratura', 'Straordinari']];

      // Genera una sezione per ogni dipendente
      sortedEmployees.forEach(([employeeId, group], index) => {
        // Se non è il primo dipendente, aggiungi una nuova pagina
        if (index > 0) {
          doc.addPage();
          currentY = 20;
        }

        // Titolo sezione dipendente
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.text(`Dipendente: ${group.employeeName}`, 20, currentY);
        currentY += 15;

        // Ordina i mesi cronologicamente
        const sortedMonths = Object.entries(group.months).sort(([a], [b]) => a.localeCompare(b));

        // Genera una tabella per ogni mese del dipendente
        sortedMonths.forEach(([monthKey, monthRecords], monthIndex) => {
          // Controlla se c'è spazio sufficiente per la tabella, altrimenti nuova pagina
          const estimatedTableHeight = monthRecords.length * 6 + 20; // Stima altezza tabella
          if (currentY + estimatedTableHeight > 250) { // 250 è circa l'altezza utile della pagina
            doc.addPage();
            currentY = 20;
          } else if (monthIndex > 0) {
            // Solo un piccolo spazio tra le tabelle dello stesso dipendente
            currentY += 5;
          }

          // Titolo mese
          const monthDate = parseISO(monthKey + '-01');
          const monthName = format(monthDate, 'MMMM yyyy', { locale: it });
          doc.setFontSize(12);
          doc.setTextColor(60, 60, 60);
          doc.text(`Mese: ${monthName}`, 20, currentY);
          currentY += 8;

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
              if (data.section === 'body') {
                const rowIndex = data.row.index;
                const attendanceRecord = sortedRecords[rowIndex];
                if (attendanceRecord) {
                  // Priorità: assenza pura (rosso) > ritardo (giallo)
                  if (isPureAbsenceDay(attendanceRecord)) {
                    data.cell.styles.fillColor = [255, 220, 220];
                  } else if (attendanceRecord.is_late) {
                    data.cell.styles.fillColor = [255, 245, 157];
                  }
                }
              }
            },
          });

          // Aggiorna la posizione Y per il prossimo elemento
          currentY = (doc as any).lastAutoTable?.finalY || currentY + 50;
        });
        
        // Aggiungi statistiche del dipendente (solo straordinari se presenti)
        const totalOvertime = Object.values(group.months).flat().reduce((sum, att) => sum + (att.overtime_hours || 0), 0);
        if (totalOvertime > 0) {
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(`Straordinari totali: ${totalOvertime.toFixed(1)} ore`, 20, currentY + 5);
          currentY += 10;
        }
      });
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
        startY: 65,
        styles: {
          fontSize: 8,
          cellPadding: 2,
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
          if (data.section === 'body') {
            const rowIndex = data.row.index;
            const attendanceRecord = singleRecords[rowIndex];
            if (attendanceRecord) {
              if (isPureAbsenceDay(attendanceRecord)) {
                data.cell.styles.fillColor = [255, 220, 220];
              } else if (attendanceRecord.is_late) {
                data.cell.styles.fillColor = [255, 245, 157];
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
