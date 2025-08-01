
import { useState } from 'react';
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
  const [periodType, setPeriodType] = useState<PeriodType>('custom');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isExporting, setIsExporting] = useState(false);
  
  const { attendances, isLoading } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const { settings: attendanceSettings } = useAttendanceSettings();
  const { getSickLeavesForDate } = useSickLeavesForCalendars();
  const { workSchedule: companyWorkSchedule } = useWorkSchedules();
  const { isHoliday, getHolidayName } = useCompanyHolidays();
  
  // Fetch leave requests for the export period
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

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
    switch (periodType) {
      case 'month':
        const monthDate = new Date(selectedYear, parseInt(selectedMonth), 1);
        return {
          from: startOfMonth(monthDate),
          to: endOfMonth(monthDate)
        };
      case 'year':
        return {
          from: startOfYear(new Date(selectedYear, 0, 1)),
          to: endOfYear(new Date(selectedYear, 11, 31))
        };
      case 'custom':
      default:
        return {
          from: dateFrom,
          to: dateTo
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

          // DEBUG: Calcola e logga il giorno lavorativo
          const isWorkingDayForEmployee = isEmployeeWorkingDay(checkDate, employeeWorkSchedules[employeeId], companyWorkSchedule);
          console.log('[PDF EXPORT DEBUG]', {
            dateStr,
            employeeId,
            employeeName: `${employee.first_name} ${employee.last_name}`,
            isWorkingDayForEmployee,
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
          // PRIORITÀ SECONDA: Se non è un giorno lavorativo, è sempre "Giorno non lavorativo"
          else if (!isWorkingDayForEmployee) {
            attendanceStatus = 'Giorno non lavorativo';
          } else if (isSickLeave) {
            attendanceStatus = 'Malattia';
          } else if (leaveForDate.find(l => l.type === 'ferie')) {
            attendanceStatus = 'Ferie';
          } else if (leaveForDate.find(l => l.type === 'permesso')) {
            attendanceStatus = 'Permesso';
          } else if (attendance?.is_business_trip) {
            attendanceStatus = 'Trasferta';
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
      
      await generateAttendancePDF({
        data: enrichedData,
        dateFrom: from,
        dateTo: to,
        exportType,
        selectedEmployee: selectedEmployeeData,
        attendanceSettings
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
            Esportazione Presenze
            {profile?.role === 'admin' && (
              <Badge variant="outline" className="ml-2">Vista Admin</Badge>
            )}
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
                    Calendario Generale
                  </div>
                </SelectItem>
                <SelectItem value="operator">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Calendario per Operatore
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
                <SelectItem value="custom">Periodo Personalizzato</SelectItem>
                <SelectItem value="month">Mese Intero</SelectItem>
                <SelectItem value="year">Anno Intero</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selezione periodo basata sul tipo */}
          {periodType === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Inizio</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: it }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      locale={it}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data Fine</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: it }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      locale={it}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {periodType === 'month' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Seleziona Mese</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
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
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
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
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Pulsante esportazione */}
          <Button 
            onClick={handleExport} 
            className="w-full"
            disabled={
              (periodType === 'custom' && (!dateFrom || !dateTo)) ||
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
                  <div>Tipo: {exportType === 'general' ? 'Calendario Generale' : 'Calendario per Operatore'}</div>
                  {exportType === 'operator' && selectedEmployee && (
                    <div>Operatore: {employees?.find(e => e.id === selectedEmployee)?.first_name} {employees?.find(e => e.id === selectedEmployee)?.last_name}</div>
                  )}
                  <div>Formato: PDF</div>
                  <div>Filtro Periodo: {
                    periodType === 'custom' ? 'Personalizzato' :
                    periodType === 'month' ? `${MONTHS[parseInt(selectedMonth)].label} ${selectedYear}` : 
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
