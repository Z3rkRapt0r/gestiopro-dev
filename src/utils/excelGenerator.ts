
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
  notes: string | null;
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

export const generateAttendanceExcel = async ({
  data,
  dateFrom,
  dateTo,
  exportType,
  selectedEmployee
}: ExportParams) => {
  // Per ora, generiamo un file CSV che può essere aperto con Excel
  // In futuro si può integrare una libreria come xlsx per generare veri file Excel
  
  const headers = exportType === 'general' 
    ? ['Data', 'Dipendente', 'Email', 'Entrata', 'Uscita', 'Tipo', 'Note']
    : ['Data', 'Entrata', 'Uscita', 'Tipo', 'Note'];
  
  const csvData = data.map(att => {
    const row = [
      format(new Date(att.date), 'dd/MM/yyyy', { locale: it }),
      exportType === 'general' ? att.employee_name : '',
      exportType === 'general' ? att.employee_email : '',
      att.check_in_time ? format(new Date(att.check_in_time), 'HH:mm') : '--:--',
      att.check_out_time ? format(new Date(att.check_out_time), 'HH:mm') : '--:--',
      att.is_manual ? 'Manuale' : att.is_business_trip ? 'Trasferta' : att.is_sick_leave ? 'Malattia' : 'Normale',
      att.notes || ''
    ];
    
    return exportType === 'general' ? row : [row[0], row[3], row[4], row[5], row[6]];
  });
  
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
