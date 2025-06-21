
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
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

export const generateAttendancePDF = async ({
  data,
  dateFrom,
  dateTo,
  exportType,
  selectedEmployee
}: ExportParams) => {
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
    format(new Date(att.date), 'dd/MM/yyyy', { locale: it }),
    exportType === 'general' ? att.employee_name : '',
    att.check_in_time ? format(new Date(att.check_in_time), 'HH:mm') : '--:--',
    att.check_out_time ? format(new Date(att.check_out_time), 'HH:mm') : '--:--',
    att.is_manual ? 'Manuale' : att.is_business_trip ? 'Trasferta' : att.is_sick_leave ? 'Malattia' : 'Normale',
    att.notes || ''
  ]);
  
  const tableHeaders = exportType === 'general' 
    ? ['Data', 'Dipendente', 'Entrata', 'Uscita', 'Tipo', 'Note']
    : ['Data', 'Entrata', 'Uscita', 'Tipo', 'Note'];
  
  const tableColumns = exportType === 'general' 
    ? tableData
    : tableData.map(row => [row[0], row[2], row[3], row[4], row[5]]);
  
  // Generazione tabella
  (doc as any).autoTable({
    head: [tableHeaders],
    body: tableColumns,
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
      0: { cellWidth: exportType === 'general' ? 25 : 30 },
      1: { cellWidth: exportType === 'general' ? 40 : 25 },
      2: { cellWidth: exportType === 'general' ? 25 : 25 },
      3: { cellWidth: exportType === 'general' ? 25 : 30 },
      4: { cellWidth: exportType === 'general' ? 30 : 50 },
      5: { cellWidth: exportType === 'general' ? 50 : undefined },
    },
    margin: { top: 55, left: 20, right: 20 },
  });
  
  // Statistiche finali
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text(`Totale presenze: ${data.length}`, 20, finalY);
  
  if (exportType === 'general') {
    const uniqueEmployees = new Set(data.map(att => att.user_id)).size;
    doc.text(`Dipendenti coinvolti: ${uniqueEmployees}`, 20, finalY + 10);
  }
  
  // Download del file
  const fileName = exportType === 'general' 
    ? `presenze_generale_${format(dateFrom, 'yyyy-MM-dd')}_${format(dateTo, 'yyyy-MM-dd')}.pdf`
    : `presenze_${selectedEmployee?.first_name}_${selectedEmployee?.last_name}_${format(dateFrom, 'yyyy-MM-dd')}_${format(dateTo, 'yyyy-MM-dd')}.pdf`;
  
  doc.save(fileName);
};
