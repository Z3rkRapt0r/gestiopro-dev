
import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useWorkingDaysTracking } from '@/hooks/useWorkingDaysTracking';
import { useEmployeeLeaveBalanceStats } from '@/hooks/useEmployeeLeaveBalanceStats';
import { useBusinessTrips } from '@/hooks/useBusinessTrips';
import { getEmployeeStatusForDate, formatHireDate } from '@/utils/employeeStatusUtils';
import type { Attendance } from '@/hooks/useAttendances';
import type { EmployeeProfile } from '@/hooks/useActiveEmployees';

interface EmployeeAttendanceCalendarProps {
  employee: EmployeeProfile;
  attendances: Attendance[];
}

// Component interno per visualizzare lo stato del dipendente
const EmployeeStatusCard = ({ employee, selectedDate, hasAttendance }: { 
  employee: EmployeeProfile; 
  selectedDate: Date | undefined; 
  hasAttendance: boolean; 
}) => {
  const [statusInfo, setStatusInfo] = useState<{
    displayText: string;
    className: string;
    iconColor: string;
    description: string;
  } | null>(null);

  React.useEffect(() => {
    if (!selectedDate) return;

    const getStatus = async () => {
      const status = await getEmployeeStatusForDate({
        employee,
        date: selectedDate,
        hasAttendance,
        isOnApprovedLeave: false, // Per semplicità, qui non gestiamo le ferie
        isOnBusinessTrip: false, // Per semplicità, qui non gestiamo le trasferte
      });

      let description = '';
      if (status.status === 'not_hired_yet') {
        description = `Il dipendente è stato assunto il ${formatHireDate(employee.hire_date!)}`;
      } else if (status.status === 'absent') {
        description = employee.tracking_start_type === 'from_year_start' 
          ? 'Dipendente esistente - presenza da caricare manualmente'
          : 'Nessuna presenza registrata per questo giorno lavorativo';
      }

      setStatusInfo({
        displayText: status.displayText,
        className: status.className,
        iconColor: status.iconColor,
        description
      });
    };

    getStatus();
  }, [employee, selectedDate, hasAttendance]);

  if (!statusInfo) return null;

  return (
    <div className={`p-3 rounded-lg border ${statusInfo.className}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 ${statusInfo.iconColor} rounded-full`}></div>
        <span className="font-semibold text-sm">
          {statusInfo.displayText}
        </span>
      </div>
      <p className="text-xs">
        {statusInfo.description}
      </p>
    </div>
  );
};

export default function EmployeeAttendanceCalendar({ employee, attendances }: EmployeeAttendanceCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { workSchedule } = useWorkSchedules();
  const { shouldTrackEmployeeOnDate } = useWorkingDaysTracking();
  const { leaveBalance } = useEmployeeLeaveBalanceStats(employee?.id);
  const { businessTrips } = useBusinessTrips();

  // Funzione per verificare se un giorno è lavorativo
  const isWorkingDay = (date: Date) => {
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

  // Funzione per determinare se una data dovrebbe essere considerata come "assente" usando la logica centralizzata
  const shouldShowAsAbsent = async (date: Date) => {
    if (!isWorkingDay(date)) return false; // Non lavorativo, non mostrare come assente
    
    const dateStr = format(date, 'yyyy-MM-dd');
    return await shouldTrackEmployeeOnDate(employee.id, dateStr);
  };

  // Ottieni le presenze per la data selezionata
  const selectedDateStr = selectedDate?.toISOString().split('T')[0];
  const selectedDateAttendance = attendances.find(att => att.date === selectedDateStr);

  // Ottieni le date con presenze (escludendo ferie)
  const attendanceDates = attendances
    .filter(att => att.check_in_time)
    .map(att => new Date(att.date));

  // Ottieni le date delle trasferte per questo dipendente
  const businessTripDates = [];
  if (businessTrips) {
    businessTrips.forEach(trip => {
      if (trip.user_id === employee.id) {
        const startDate = new Date(trip.start_date);
        const endDate = new Date(trip.end_date);
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          businessTripDates.push(new Date(d));
        }
      }
    });
  }

  // Verifica se la data selezionata è in trasferta
  const isOnBusinessTrip = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return businessTrips?.some(trip => {
      if (trip.user_id !== employee.id) return false;
      const tripStart = new Date(trip.start_date);
      const tripEnd = new Date(trip.end_date);
      const currentDate = new Date(date);
      return currentDate >= tripStart && currentDate <= tripEnd;
    }) || false;
  };

  // Ottieni i dettagli della trasferta per la data selezionata
  const getBusinessTripForDate = (date: Date) => {
    if (!businessTrips) return null;
    const dateStr = format(date, 'yyyy-MM-dd');
    return businessTrips.find(trip => {
      if (trip.user_id !== employee.id) return false;
      const tripStart = new Date(trip.start_date);
      const tripEnd = new Date(trip.end_date);
      const currentDate = new Date(date);
      return currentDate >= tripStart && currentDate <= tripEnd;
    });
  };

  // Genera le date che dovrebbero essere mostrate come assenti (rosse) dall'inizio dell'anno
  const getAbsentDates = async () => {
    const dates = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Data di inizio: 1° gennaio dell'anno corrente oppure data di assunzione se più tarda
    let startDate = new Date(currentYear, 0, 1);
    if (employee.hire_date) {
      const hireDate = new Date(employee.hire_date);
      if (hireDate > startDate) {
        startDate = hireDate;
      }
    }
    
    const endDate = today;
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const shouldShow = await shouldShowAsAbsent(d);
      if (shouldShow) {
        // Verifica se NON ha presenza per questa data E non è in trasferta
        const dateStr = d.toISOString().split('T')[0];
        const hasAttendance = attendances.some(att => att.date === dateStr && att.check_in_time);
        const isBusinessTrip = isOnBusinessTrip(d);
        if (!hasAttendance && !isBusinessTrip) {
          dates.push(new Date(d));
        }
      }
    }
    return dates;
  };

  const [absentDates, setAbsentDates] = useState<Date[]>([]);

  React.useEffect(() => {
    getAbsentDates().then(setAbsentDates);
  }, [employee.id, attendances, businessTrips]);

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    return new Date(timeString).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedDateBusinessTrip = selectedDate ? getBusinessTripForDate(selectedDate) : null;

  return (
    <div className="space-y-6">
      {/* Sezione Bilanci Ferie e Permessi */}
      {leaveBalance && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="w-4 h-4" />
              Bilanci Ferie e Permessi {leaveBalance.year}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-purple-700">Giorni di Ferie</div>
                <div className="flex justify-between text-sm">
                  <span>Totali:</span>
                  <span className="font-medium">{leaveBalance.vacation_days_total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Utilizzati:</span>
                  <span className="font-medium text-red-600">{leaveBalance.vacation_days_used}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Rimanenti:</span>
                  <span className="font-medium text-green-600">{leaveBalance.vacation_days_remaining}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-purple-700">Ore di Permesso</div>
                <div className="flex justify-between text-sm">
                  <span>Totali:</span>
                  <span className="font-medium">{leaveBalance.permission_hours_total}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Utilizzate:</span>
                  <span className="font-medium text-red-600">{leaveBalance.permission_hours_used}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Rimanenti:</span>
                  <span className="font-medium text-green-600">{leaveBalance.permission_hours_remaining}h</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendario dell'operatore */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="w-4 h-4" />
              {employee.first_name} {employee.last_name}
              {employee.tracking_start_type === 'from_year_start' && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                  Dipendente esistente
                </Badge>
              )}
              {employee.tracking_start_type === 'from_hire_date' && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                  Nuovo dipendente
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={it}
                modifiers={{
                  present: attendanceDates,
                  absent: absentDates,
                  businessTrip: businessTripDates
                }}
                modifiersStyles={{
                  present: {
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    fontWeight: 'bold'
                  },
                  absent: {
                    backgroundColor: '#fecaca',
                    color: '#dc2626',
                    fontWeight: 'bold'
                  },
                  businessTrip: {
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    fontWeight: 'bold'
                  }
                }}
                className="rounded-md border w-fit"
              />
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-green-200 rounded"></div>
                <span>Giorni di presenza</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-yellow-200 rounded"></div>
                <span>Giorni in trasferta</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-red-200 rounded"></div>
                <span>Giorni di assenza (dall'inizio anno)</span>
              </div>
            </div>
            
            {/* Info configurazione orari di lavoro */}
            {workSchedule && (
              <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xs font-medium text-blue-700 mb-1">Orari: {workSchedule.start_time} - {workSchedule.end_time}</div>
                <div className="flex flex-wrap gap-1">
                  {workSchedule.monday && <span className="bg-blue-100 px-1 rounded text-xs">Lun</span>}
                  {workSchedule.tuesday && <span className="bg-blue-100 px-1 rounded text-xs">Mar</span>}
                  {workSchedule.wednesday && <span className="bg-blue-100 px-1 rounded text-xs">Mer</span>}
                  {workSchedule.thursday && <span className="bg-blue-100 px-1 rounded text-xs">Gio</span>}
                  {workSchedule.friday && <span className="bg-blue-100 px-1 rounded text-xs">Ven</span>}
                  {workSchedule.saturday && <span className="bg-blue-100 px-1 rounded text-xs">Sab</span>}
                  {workSchedule.sunday && <span className="bg-blue-100 px-1 rounded text-xs">Dom</span>}
                </div>
              </div>
            )}

            {/* Info sul tipo di tracciamento */}
            <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-xs font-medium text-yellow-700 mb-1">
                Tipo di tracciamento: {employee.tracking_start_type === 'from_year_start' ? 'Dipendente esistente' : 'Nuovo dipendente'}
              </div>
              <div className="text-xs text-yellow-600">
                {employee.tracking_start_type === 'from_year_start' 
                  ? 'Le assenze devono essere caricate manualmente per tutto l\'anno' 
                  : `Tracciamento dal ${employee.hire_date ? format(new Date(employee.hire_date), 'dd/MM/yyyy') : 'N/A'}`
                }
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dettagli della data selezionata */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4" />
              Dettagli {selectedDate ? format(selectedDate, 'dd/MM', { locale: it }) : ''}
              {selectedDate && !isWorkingDay(selectedDate) && (
                <Badge variant="outline" className="bg-gray-50 text-gray-600 text-xs">
                  Non lavorativo
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {selectedDate && !isWorkingDay(selectedDate) ? (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="font-semibold text-gray-700 text-sm">Non lavorativo</span>
                </div>
                <p className="text-xs text-gray-600">
                  Giorno non configurato come lavorativo
                </p>
              </div>
            ) : selectedDateBusinessTrip ? (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="font-semibold text-yellow-700 text-sm">In Trasferta</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-gray-600">Destinazione:</span>
                    <div className="font-medium text-yellow-700">
                      {selectedDateBusinessTrip.destination}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Periodo:</span>
                    <div className="font-medium text-yellow-700">
                      {format(new Date(selectedDateBusinessTrip.start_date), 'dd/MM/yyyy')} - {format(new Date(selectedDateBusinessTrip.end_date), 'dd/MM/yyyy')}
                    </div>
                  </div>
                  {selectedDateBusinessTrip.reason && (
                    <div>
                      <span className="text-gray-600">Motivo:</span>
                      <div className="font-medium text-yellow-700">
                        {selectedDateBusinessTrip.reason}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : selectedDateAttendance ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-semibold text-green-700 text-sm">Presente</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-gray-600">Entrata:</span>
                      <div className="font-medium">
                        {formatTime(selectedDateAttendance.check_in_time)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Uscita:</span>
                      <div className="font-medium">
                        {formatTime(selectedDateAttendance.check_out_time)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmployeeStatusCard 
                employee={employee}
                selectedDate={selectedDate}
                hasAttendance={!!selectedDateAttendance}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
