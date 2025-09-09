
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calendar as CalendarIcon, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, isValid, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useAuth } from '@/hooks/useAuth';
import { useAttendanceSettings } from '@/hooks/useAttendanceSettings';
import { useDashboardSettings } from '@/hooks/useDashboardSettings';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { generateAttendancePDF } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { useSickLeavesForCalendars } from '@/hooks/useSickLeavesForCalendars';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useCompanyHolidays } from '@/hooks/useCompanyHolidays';
import { isEmployeeWorkingDay } from '@/utils/employeeStatusUtils';

type PeriodType = 'custom' | 'month' | 'year';

// Mesi per il select
const MONTHS = [
  { value: '0', label: 'Gennaio' },
  { value: '1', label: 'Febbraio' },
  { value: '2', label: 'Marzo' },
  { value: '3', label: 'Aprile' },
  { value: '4', label: 'Maggio' },
  { value: '5', label: 'Giugno' },
  { value: '6', label: 'Luglio' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Settembre' },
  { value: '9', label: 'Ottobre' },
  { value: '10', label: 'Novembre' },
  { value: '11', label: 'Dicembre' }
];

export default function AttendanceExportSection() {
  const [exportType, setExportType] = useState<'general' | 'operator'>('general');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isExporting, setIsExporting] = useState(false);
  
  const { attendances, isLoading } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const { settings: attendanceSettings } = useAttendanceSettings();
  const { settings: dashboardSettings } = useDashboardSettings();
  const { getSickLeavesForDate } = useSickLeavesForCalendars();
  const { workSchedule: companyWorkSchedule } = useWorkSchedules();
  const { isHoliday, getHolidayName } = useCompanyHolidays();
  
  // Fetch leave requests for the export period
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  // Calcola gli anni disponibili basati sui dati di presenza
  const availableYears = useMemo(() => {
    if (!attendances || attendances.length === 0) {
      return [new Date().getFullYear()]; // Solo anno corrente se non ci sono dati
    }

    const years = new Set<number>();
    attendances.forEach(attendance => {
      if (attendance.date) {
        const year = new Date(attendance.date).getFullYear();
        years.add(year);
      }
    });

    // Aggiungi anche l'anno corrente se non è già presente
    const currentYear = new Date().getFullYear();
    years.add(currentYear);

    // Ordina gli anni in ordine decrescente (dal più recente al più vecchio)
    return Array.from(years).sort((a, b) => b - a);
  }, [attendances]);

  // Calcola i mesi disponibili per l'anno selezionato
  const availableMonths = useMemo(() => {
    if (!attendances || attendances.length === 0) {
      return MONTHS; // Tutti i mesi se non ci sono dati
    }

    const months = new Set<number>();
    attendances.forEach(attendance => {
      if (attendance.date) {
        const date = new Date(attendance.date);
        if (date.getFullYear() === selectedYear) {
          months.add(date.getMonth());
        }
      }
    });

    // Se non ci sono dati per l'anno selezionato, mostra tutti i mesi
    if (months.size === 0) {
      return MONTHS;
    }

    // Filtra i mesi che hanno dati
    return MONTHS.filter(month => months.has(parseInt(month.value)));
  }, [attendances, selectedYear]);

  // Aggiorna l'anno selezionato se non è più disponibile
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]); // Usa l'anno più recente
    }
  }, [availableYears, selectedYear]);

  // Aggiorna il mese selezionato se non è più disponibile per l'anno selezionato
  useEffect(() => {
    if (availableMonths.length > 0) {
      const currentMonthIndex = availableMonths.findIndex(month => month.value === selectedMonth);
      if (currentMonthIndex === -1) {
        setSelectedMonth(availableMonths[0].value); // Usa il primo mese disponibile
      }
    }
  }, [availableMonths, selectedMonth]);

  // Funzione per validare e formattare le date/orari
  const safeFormatDateTime = (dateTimeStr: string | null, formatStr: string) => {
    if (!dateTimeStr) return '--:--';
    
    try {
      const date = typeof dateTimeStr === 'string' ? parseISO(dateTimeStr) : new Date(dateTimeStr);
      if (!isValid(date)) return '--:--';
      return format(date, formatStr, { locale: it });
    } catch (error) {
      console.error('Errore formattazione data:', error, dateTimeStr);
      return '--:--';
    }
  };

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

  const getDateRange = () => {
    const today = new Date();
    
    switch (periodType) {
      case 'month':
        const monthDate = new Date(selectedYear, parseInt(selectedMonth), 1);
        const endOfSelectedMonth = endOfMonth(monthDate);
        
        // Per l'esportazione mensile, limita al giorno corrente se il mese selezionato è quello attuale
        const isCurrentMonth = monthDate.getFullYear() === today.getFullYear() && 
                              monthDate.getMonth() === today.getMonth();
        
        return {
          from: startOfMonth(monthDate),
          to: isCurrentMonth ? today : endOfSelectedMonth
        };
      case 'year':
        const yearDate = new Date(selectedYear, 0, 1);
        
        // Trova la data del primo record per l'anno selezionato
        const firstRecordDate = attendances?.reduce((earliest, att) => {
          try {
            const attDate = parseISO(att.date);
            if (!isValid(attDate)) return earliest;
            
            // Se il record è dell'anno selezionato e precedente al record più antico trovato
            if (attDate.getFullYear() === selectedYear && (!earliest || attDate < earliest)) {
              return attDate;
            }
          } catch (error) {
            console.error('Errore parsing data:', error, att.date);
          }
          return earliest;
        }, null as Date | null);
        
        // Se non ci sono dati per l'anno, usa l'inizio dell'anno
        const fromDate = firstRecordDate || startOfYear(yearDate);
        
        // Per l'esportazione annuale, limita al giorno corrente se l'anno selezionato è quello attuale
        const isCurrentYear = yearDate.getFullYear() === today.getFullYear();
        
        return {
          from: fromDate,
          to: isCurrentYear ? today : endOfYear(yearDate)
        };
      default:
        return {
          from: startOfMonth(new Date(selectedYear, parseInt(selectedMonth), 1)),
          to: new Date()
        };
    }
  };

  const handleExport = async () => {
    const { from, to } = getDateRange();

    if (!from || !to) {
      toast({
        title: "Errore",
        description: "Seleziona un periodo valido",
        variant: "destructive"
      });
      return;
    }

    if (exportType === 'operator' && !selectedEmployee) {
      toast({
        title: "Errore", 
        description: "Seleziona un operatore",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      // Fetch leave requests for the period
      setIsLoadingLeaves(true);
      const { data: leaveRequestsData } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('status', 'approved')
        .or(`and(date_from.gte.${format(from, 'yyyy-MM-dd')},date_from.lte.${format(to, 'yyyy-MM-dd')}),and(date_to.gte.${format(from, 'yyyy-MM-dd')},date_to.lte.${format(to, 'yyyy-MM-dd')}),and(day.gte.${format(from, 'yyyy-MM-dd')},day.lte.${format(to, 'yyyy-MM-dd')})`);
      
      // Fetch overtime records for the period
      const { data: overtimeData } = await supabase
        .from('overtime_records')
        .select('user_id, date, hours, notes')
        .gte('date', format(from, 'yyyy-MM-dd'))
        .lte('date', format(to, 'yyyy-MM-dd'));

      // NUOVO: Fetch business trips for the period
      const { data: businessTripsData } = await supabase
        .from('business_trips')
        .select('user_id, start_date, end_date, destination, reason')
        .eq('status', 'approved')
        .or(`and(start_date.gte.${format(from, 'yyyy-MM-dd')},start_date.lte.${format(to, 'yyyy-MM-dd')}),and(end_date.gte.${format(from, 'yyyy-MM-dd')},end_date.lte.${format(to, 'yyyy-MM-dd')})`);

      setLeaveRequests(leaveRequestsData || []);
      setIsLoadingLeaves(false);

      // Filtra i dati in base ai parametri
      let filteredData = attendances?.filter(att => {
        try {
          const attDate = parseISO(att.date);
          if (!isValid(attDate)) {
            console.warn('Data non valida trovata:', att.date);
            return false;
          }
          
          const isInRange = attDate >= from && attDate <= to;
          
          if (exportType === 'operator') {
            return isInRange && att.user_id === selectedEmployee;
          }
          
          return isInRange;
        } catch (error) {
          console.error('Errore durante il filtraggio:', error, att);
          return false;
        }
      }) || [];

      // Create a comprehensive dataset that includes all dates in range for selected employees
      const allEmployeeIds = exportType === 'operator' ? [selectedEmployee] : 
        (employees?.map(emp => emp.id) || []);
      
      const dateRange = [];
      const currentDate = new Date(from);
      while (currentDate <= to) {
        dateRange.push(format(currentDate, 'yyyy-MM-dd'));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Create combined data including leave requests
      const enrichedData = [];
      
      const employeeWorkSchedules: { [employeeId: string]: any } = {};
      for (const employeeId of allEmployeeIds) {
        const { data: employeeSchedule } = await supabase
          .from('employee_work_schedules')
          .select('*')
          .eq('employee_id', employeeId)
          .maybeSingle();
        if (employeeSchedule) {
          employeeWorkSchedules[employeeId] = employeeSchedule;
        }
      }

      for (const employeeId of allEmployeeIds) {
        const employee = employees?.find(emp => emp.id === employeeId);
        if (!employee) continue;
        
        for (const dateStr of dateRange) {
          const checkDate = new Date(dateStr);
          // Find attendance record for this date/employee
          const attendance = filteredData.find(att => 
            att.user_id === employeeId && att.date === dateStr
          );
          
          // Find leave requests for this date/employee
          const leaveForDate = (leaveRequestsData || []).filter(leave => {
            if (leave.user_id !== employeeId) return false;
            
            // Check vacation/permission ranges
            if (leave.type === 'ferie' && leave.date_from && leave.date_to) {
              const leaveStart = new Date(leave.date_from);
              const leaveEnd = new Date(leave.date_to);
              const checkDate = new Date(dateStr);
              return checkDate >= leaveStart && checkDate <= leaveEnd;
            }
            
            // Check permission single day
            if (leave.type === 'permesso' && leave.day) {
              return leave.day === dateStr;
            }
            
            return false;
          });

          // Find overtime for this date/employee
          const overtimeForDate = (overtimeData || []).find(overtime => 
            overtime.user_id === employeeId && overtime.date === dateStr
          );

          // Find sick leaves for this date/employee
          const sickLeavesForDate = getSickLeavesForDate(dateStr);
          const isSickLeave = sickLeavesForDate.some(sl => sl.user_id === employeeId);

          // NUOVO: Check if this date is covered by a business trip
          const isBusinessTripDate = businessTripsData?.some(trip => {
            if (trip.user_id !== employeeId) return false;
            const tripStart = new Date(trip.start_date);
            const tripEnd = new Date(trip.end_date);
            const checkDate = new Date(dateStr);
            return checkDate >= tripStart && checkDate <= tripEnd;
          }) || false;

          // DEBUG: Calcola e logga il giorno lavorativo
          const isWorkingDayForEmployee = isEmployeeWorkingDay(checkDate, employeeWorkSchedules[employeeId], companyWorkSchedule);
          console.log('[PDF EXPORT DEBUG]', {
            dateStr,
            employeeId,
            employeeName: `${employee.first_name} ${employee.last_name}`,
            isWorkingDayForEmployee,
            isBusinessTripDate,
            attendanceIsBusinessTrip: attendance?.is_business_trip,
            employeeWorkSchedule: employeeWorkSchedules[employeeId],
            companyWorkSchedule,
            dayOfWeek: checkDate.getDay(),
            dayName: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][checkDate.getDay()]
          });

          // NUOVO: Determina lo stato di presenza considerando i giorni non lavorativi e le festività
          let attendanceStatus = 'Presente';
          
          // Verifica se è una festività
          const isHolidayDate = isHoliday(checkDate);
          const holidayName = getHolidayName(checkDate);
          
          // PRIORITÀ ASSOLUTA: Se è una festività, è sempre "Festività"
          if (isHolidayDate) {
            attendanceStatus = holidayName ? `Festività: ${holidayName}` : 'Festività';
          }
          // PRIORITÀ: Se è una trasferta (da attendance o da business_trips), è sempre "Trasferta"
          else if (attendance?.is_business_trip || isBusinessTripDate) {
            attendanceStatus = 'Trasferta';
          }
          // PRIORITÀ SECONDA: Se non è un giorno lavorativo, è sempre "Giorno non lavorativo"
          else if (!isWorkingDayForEmployee) {
            attendanceStatus = 'Giorno non lavorativo';
          } else if (isSickLeave) {
            attendanceStatus = 'Malattia';
          } else if (leaveForDate.find(l => l.type === 'ferie')) {
            attendanceStatus = 'Ferie';
          } else if (leaveForDate.find(l => l.type === 'permesso')) {
            attendanceStatus = 'Permesso';
          } else if (attendance?.check_in_time || attendance?.check_out_time) {
            attendanceStatus = 'Presente';
          } else {
            attendanceStatus = 'Assente';
          }

          // Includi sempre tutte le date, e imposta attendance_status = 'Giorno non lavorativo' se necessario
          enrichedData.push({
            id: attendance?.id || `virtual-${employeeId}-${dateStr}`,
            user_id: employeeId,
            date: dateStr,
            day_name: format(checkDate, 'EEEE', { locale: it }), // Nome del giorno in italiano
            check_in_time: attendance?.check_in_time || null,
            check_out_time: attendance?.check_out_time || null,
            is_manual: attendance?.is_manual || false,
            is_business_trip: attendance?.is_business_trip || false,
            is_sick_leave: isSickLeave,
            is_late: attendance?.is_late || false,
            late_minutes: attendance?.late_minutes || 0,
            notes: attendance?.notes || '',
            employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
            employee_email: employee.email || 'N/A',
            // Leave data
            leave_requests: leaveForDate,
            vacation_leave: leaveForDate.find(l => l.type === 'ferie'),
            permission_leave: leaveForDate.find(l => l.type === 'permesso'),
            // Overtime data
            overtime_hours: overtimeForDate?.hours || null,
            overtime_notes: overtimeForDate?.notes || null,
            // NUOVO: Aggiungi lo stato di presenza calcolato
            attendance_status: attendanceStatus,
            // Helper functions
            safeFormatDate: () => safeFormatDate(dateStr),
            safeFormatCheckIn: () => safeFormatDateTime(attendance?.check_in_time, 'HH:mm'),
            safeFormatCheckOut: () => safeFormatDateTime(attendance?.check_out_time, 'HH:mm')
          });
        }
      }

      if (enrichedData.length === 0) {
        toast({
          title: "Attenzione",
          description: "Nessun dato trovato per il periodo selezionato",
          variant: "destructive"
        });
        return;
      }

      const selectedEmployeeData = selectedEmployee ? 
        employees?.find(emp => emp.id === selectedEmployee) : null;
      
      console.log('Dashboard settings:', dashboardSettings);
      console.log('Logo URL per PDF:', dashboardSettings.logo_url);
      
      await generateAttendancePDF({
        data: enrichedData,
        dateFrom: from,
        dateTo: to,
        exportType,
        selectedEmployee: selectedEmployeeData,
        attendanceSettings,
        companyLogoUrl: dashboardSettings.logo_url,
        workSchedule: companyWorkSchedule,
        isHoliday: isHoliday
      });
      
      toast({
        title: "Successo",
        description: `PDF generato con successo per ${enrichedData.length} record`
      });
    } catch (error) {
      console.error('Errore durante l\'esportazione:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'esportazione. Controlla i dati e riprova.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || isLoadingLeaves) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Esportazione massiva presenze dipendenti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipo di esportazione */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo di Esportazione</label>
            <Select value={exportType} onValueChange={(value: 'general' | 'operator') => setExportType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Resoconto di tutti i dipendenti
                  </div>
                </SelectItem>
                <SelectItem value="operator">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Resoconto per singolo dipendente
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selezione operatore (solo se tipo = operator) */}
          {exportType === 'operator' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleziona Operatore</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Scegli un operatore..." />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name} ({employee.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tipo di periodo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo di Periodo</label>
            <Select value={periodType} onValueChange={(value: PeriodType) => setPeriodType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mese</SelectItem>
                <SelectItem value="year">Anno</SelectItem>
              </SelectContent>
            </Select>
          </div>


          {periodType === 'month' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Seleziona Mese</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Seleziona Anno</label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {periodType === 'year' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleziona Anno</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Pulsante esportazione */}
          <Button 
            onClick={handleExport} 
            className="w-full"
            disabled={
              (exportType === 'operator' && !selectedEmployee) || 
              isExporting
            }
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Esportazione in corso...' : 'Esporta PDF'}
          </Button>

          {/* Anteprima dati */}
          {(() => {
            const { from, to } = getDateRange();
            return from && to && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-700 mb-2">Anteprima Esportazione</div>
                <div className="text-xs text-blue-600 space-y-1">
                  <div>Periodo: {format(from, 'dd/MM/yyyy', { locale: it })} - {format(to, 'dd/MM/yyyy', { locale: it })}</div>
                  <div>Tipo: {exportType === 'general' ? 'Resoconto di tutti i dipendenti' : 'Resoconto per singolo dipendente'}</div>
                  {exportType === 'operator' && selectedEmployee && (
                    <div>Operatore: {employees?.find(e => e.id === selectedEmployee)?.first_name} {employees?.find(e => e.id === selectedEmployee)?.last_name}</div>
                  )}
                  <div>Formato: PDF</div>
                  <div>Filtro Periodo: {
                    periodType === 'month' ? `${availableMonths.find(m => m.value === selectedMonth)?.label} ${selectedYear}` : 
                    `Anno ${selectedYear}`
                  }</div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
