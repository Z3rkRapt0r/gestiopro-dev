
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

export const generateAttendancePDF = async ({
  data,
  dateFrom,
  dateTo,
  exportType,
  selectedEmployee
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
    
    // Preparazione dati per la tabella
    const tableData = data.map(att => [
      safeFormatDate(att.date),
      att.employee_name || 'N/A',
      getBaseAttendanceStatus(att),
      getAttendanceTimeRange(att),
      getPermissionTimeRange(att)
    ]);
    
    const tableHeaders = [['Data', 'Nome Dipendente', 'Stato Presenza', 'Orario Timbratura', 'Permesso']];
    
    console.log('Creazione tabella con', tableData.length, 'righe');
    
    // Generazione tabella usando autoTable
    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: 55,
      styles: {
        fontSize: 9,
        cellPadding: 3,
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
        0: { cellWidth: 25 }, // Data
        1: { cellWidth: 45 }, // Nome Dipendente
        2: { cellWidth: 35 }, // Stato Presenza
        3: { cellWidth: 35 }, // Orario Timbratura
        4: { cellWidth: 30 }, // Permesso
      },
      margin: { top: 55, left: 20, right: 20 },
    });
    
    // Statistiche finali
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(`Totale presenze: ${data.length}`, 20, finalY + 15);
    
    if (exportType === 'general') {
      const uniqueEmployees = new Set(data.map(att => att.user_id)).size;
      doc.text(`Dipendenti coinvolti: ${uniqueEmployees}`, 20, finalY + 25);
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
