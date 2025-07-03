
import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar as CalendarIcon, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useRealisticAttendanceStats } from '@/hooks/useRealisticAttendanceStats';
import { useEmployeeLeaveBalanceStats } from '@/hooks/useEmployeeLeaveBalanceStats';
import { useSickLeavesForCalendars } from '@/hooks/useSickLeavesForCalendars';
import type { UnifiedAttendance } from '@/hooks/useUnifiedAttendances';
import type { EmployeeProfile } from '@/hooks/useActiveEmployees';

interface NewEmployeeAttendanceCalendarProps {
  employee: EmployeeProfile;
  attendances: UnifiedAttendance[];
}

export default function NewEmployeeAttendanceCalendar({ employee, attendances }: NewEmployeeAttendanceCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { workSchedule } = useWorkSchedules();
  const { leaveRequests } = useLeaveRequests();
  const stats = useRealisticAttendanceStats(employee, attendances, workSchedule);
  const { leaveBalance } = useEmployeeLeaveBalanceStats(employee?.id);
  const { getSickLeavesForUser, isUserSickOnDate } = useSickLeavesForCalendars();

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

  // Funzione per verificare se il dipendente era già stato assunto alla data
  const isEmployeeHiredOnDate = (date: Date) => {
    if (!employee.hire_date) return true;
    return date >= new Date(employee.hire_date);
  };

  // Funzione per verificare se una data è in un periodo di ferie approvate
  const isDateInApprovedLeave = (date: Date) => {
    if (!leaveRequests || !employee?.id) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    return leaveRequests.some(request => {
      if (request.user_id !== employee.id || request.status !== 'approved') return false;
      
      if (request.type === 'ferie' && request.date_from && request.date_to) {
        return dateStr >= request.date_from && dateStr <= request.date_to;
      }
      
      return false;
    });
  };

  // Formattiamo la data selezionata in modo consistente
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const selectedDateAttendance = attendances.find(att => att.date === selectedDateStr);

  // Date con presenze per il calendario (escludendo ferie e malattie)
  const attendanceDates = useMemo(() => {
    return attendances
      .filter(att => (att.check_in_time || att.is_sick_leave) && !att.notes?.includes('Ferie'))
      .map(att => {
        const [year, month, day] = att.date.split('-').map(Number);
        return new Date(year, month - 1, day);
      });
  }, [attendances]);

  // Date di ferie - include sia quelle dalle note che dalle richieste approvate
  const vacationDates = useMemo(() => {
    const datesFromNotes = attendances
      .filter(att => att.notes?.includes('Ferie'))
      .map(att => {
        const [year, month, day] = att.date.split('-').map(Number);
        return new Date(year, month - 1, day);
      });

    const datesFromApprovedLeaves = [];
    if (leaveRequests && employee?.id) {
      leaveRequests.forEach(request => {
        if (request.user_id === employee.id && request.status === 'approved' && request.type === 'ferie' && request.date_from && request.date_to) {
          const startDate = new Date(request.date_from);
          const endDate = new Date(request.date_to);
          
          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            datesFromApprovedLeaves.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      });
    }

    // Combina le date e rimuovi i duplicati
    const allDates = [...datesFromNotes, ...datesFromApprovedLeaves];
    const uniqueDates = allDates.filter((date, index, self) => 
      index === self.findIndex(d => d.getTime() === date.getTime())
    );

    return uniqueDates;
  }, [attendances, leaveRequests, employee?.id]);

  // Date con malattie per il calendario - NUOVA LOGICA con tabella sick_leaves
  const sickLeaveDates = useMemo(() => {
    if (!employee?.id) return [];
    
    const sickDays = getSickLeavesForUser(employee.id);
    return sickDays.map(sickDay => {
      const [year, month, day] = sickDay.date.split('-').map(Number);
      return new Date(year, month - 1, day);
    });
  }, [employee?.id, getSickLeavesForUser]);

  // Calcola i giorni di assenza dall'inizio dell'anno (o dalla data di assunzione se più tarda) escludendo le ferie approvate
  const absentDates = useMemo(() => {
    if (!employee?.id || !stats.hasValidData) return [];

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Data di inizio: 1° gennaio dell'anno corrente oppure data di assunzione se più tarda
    let startDate = new Date(currentYear, 0, 1);
    if (employee.hire_date) {
      const hireDate = new Date(employee.hire_date);
      if (hireDate > startDate) {
        startDate = hireDate;
      }
    }
    
    const absentDates = [];
    const tempDate = new Date(startDate);
    
    while (tempDate <= currentDate) {
      if (isEmployeeHiredOnDate(tempDate)) {
        const dateStr = format(tempDate, 'yyyy-MM-dd');
        const hasAttendance = attendances.some(att => att.date === dateStr);
        const isOnApprovedLeave = isDateInApprovedLeave(tempDate);
        
        // Verifica se è in malattia usando il nuovo hook
        const isSick = isUserSickOnDate(employee.id, dateStr);
        
        // Se è un giorno lavorativo, non ha presenza, non è in ferie approvate, non è in malattia e la data è passata
        if (isWorkingDay(tempDate) && !hasAttendance && !isOnApprovedLeave && !isSick && tempDate < currentDate) {
          absentDates.push(new Date(tempDate));
        }
      }
      
      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    return absentDates;
  }, [employee?.id, employee?.hire_date, attendances, workSchedule, stats, leaveRequests]);

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    
    // Gestione per il formato HH:MM
    if (timeString.match(/^\d{2}:\d{2}$/)) {
      return timeString;
    }
    
    // Fallback per altri formati
    try {
      if (timeString.includes('T')) {
        const [, timePart] = timeString.split('T');
        const [hours, minutes] = timePart.split(':');
        return `${hours}:${minutes}`;
      }
      
      if (timeString.includes(' ')) {
        const [, timePart] = timeString.split(' ');
        const [hours, minutes] = timePart.split(':');
        return `${hours}:${minutes}`;
      }
      
      return timeString;
    } catch (error) {
      console.error('Errore nel parsing del timestamp:', timeString, error);
      return '--:--';
    }
  };

  return (
    <div className="space-y-6">
      {/* Resoconto Annuale */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="w-4 h-4" />
            Resoconto Annuale {new Date().getFullYear()}
            <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
              {employee.tracking_start_type === 'from_hire_date' ? 'Nuovo Dipendente' : 'Dipendente Esistente'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {!stats.hasValidData ? (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {stats.errorMessage}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{stats.totalWorkingDays}</div>
                  <div className="text-sm text-blue-600">Giorni Lavorativi</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{stats.presentDays}</div>
                  <div className="text-sm text-green-600">Giorni Presenti</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-700">{stats.sickDays}</div>
                  <div className="text-sm text-orange-600">Giorni Malattia</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-700">{stats.absentDays}</div>
                  <div className="text-sm text-red-600">Giorni Assenti</div>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <div className="text-lg font-semibold">
                  Percentuale Presenza: <span className="text-blue-700">{stats.attendancePercentage}%</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Periodo: {stats.calculationPeriod.description}
                </div>
              </div>

              {/* Sezione Bilanci Ferie e Permessi */}
              {leaveBalance && (
                <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="text-sm font-medium text-purple-700 mb-3">Bilanci Ferie e Permessi {leaveBalance.year}</h3>
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
                </div>
              )}
            </>
          )}
          
          {/* Info configurazione */}
          {workSchedule && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-700 mb-2">Configurazione Orari:</div>
              <div className="text-xs text-blue-600 space-y-1">
                <div>Orari: {workSchedule.start_time} - {workSchedule.end_time}</div>
                <div className="flex flex-wrap gap-1">
                  {workSchedule.monday && <span className="bg-blue-100 px-1 rounded">Lun</span>}
                  {workSchedule.tuesday && <span className="bg-blue-100 px-1 rounded">Mar</span>}
                  {workSchedule.wednesday && <span className="bg-blue-100 px-1 rounded">Mer</span>}
                  {workSchedule.thursday && <span className="bg-blue-100 px-1 rounded">Gio</span>}
                  {workSchedule.friday && <span className="bg-blue-100 px-1 rounded">Ven</span>}
                  {workSchedule.saturday && <span className="bg-blue-100 px-1 rounded">Sab</span>}
                  {workSchedule.sunday && <span className="bg-blue-100 px-1 rounded">Dom</span>}
                </div>
              </div>
            </div>
          )}

          {/* Info sul tipo di tracciamento */}
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-xs font-medium text-yellow-700 mb-1">
              Tipo di tracciamento: {employee.tracking_start_type === 'from_hire_date' ? 'Nuovo dipendente' : 'Dipendente esistente'}
            </div>
            <div className="text-xs text-yellow-600">
              {employee.tracking_start_type === 'from_hire_date' 
                ? `Tracciamento dal ${employee.hire_date ? format(new Date(employee.hire_date), 'dd/MM/yyyy') : 'N/A'} (data di assunzione)` 
                : 'Tracciamento dall\'inizio dell\'anno - le assenze devono essere caricate manualmente'
              }
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendario dell'operatore */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="w-4 h-4" />
              {employee.first_name} {employee.last_name}
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
                  present: attendanceDates.filter(date => 
                    !sickLeaveDates.some(sickDate => sickDate.getTime() === date.getTime()) &&
                    !vacationDates.some(vacDate => vacDate.getTime() === date.getTime())
                  ),
                  vacation: vacationDates,
                  sickLeave: sickLeaveDates,
                  absent: absentDates
                }}
                modifiersStyles={{
                  present: {
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    fontWeight: 'bold'
                  },
                  vacation: {
                    backgroundColor: '#ddd6fe',
                    color: '#6b21a8',
                    fontWeight: 'bold'
                  },
                  sickLeave: {
                    backgroundColor: '#fed7aa',
                    color: '#9a3412',
                    fontWeight: 'bold'
                  },
                  absent: {
                    backgroundColor: '#fecaca',
                    color: '#991b1b',
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
                <div className="w-3 h-3 bg-purple-200 rounded"></div>
                <span>Giorni di ferie</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-orange-200 rounded"></div>
                <span>Giorni di malattia</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-red-200 rounded"></div>
                <span>Giorni di assenza (dall'inizio anno)</span>
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
            {selectedDate && !isEmployeeHiredOnDate(selectedDate) ? (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="font-semibold text-gray-700 text-sm">Non ancora assunto</span>
                </div>
                <p className="text-xs text-gray-600">
                  Il dipendente è stato assunto il {employee.hire_date ? format(new Date(employee.hire_date), 'dd/MM/yyyy') : 'N/A'}
                </p>
              </div>
            ) : selectedDate && !isWorkingDay(selectedDate) ? (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="font-semibold text-gray-700 text-sm">Non lavorativo</span>
                </div>
                <p className="text-xs text-gray-600">
                  Questo giorno non è configurato come giorno lavorativo
                </p>
              </div>
            ) : selectedDate && isDateInApprovedLeave(selectedDate) ? (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="font-semibold text-purple-700 text-sm">Ferie</span>
                  {selectedDateAttendance?.is_manual && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                      Manuale
                    </Badge>
                  )}
                </div>
                {selectedDateAttendance ? (
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
                ) : (
                  <p className="text-xs text-purple-600">
                    Ferie approvate per questo giorno
                  </p>
                )}
              </div>
            ) : selectedDateAttendance ? (
              <div className="space-y-3">
                {selectedDateAttendance.notes?.includes('Ferie') ? (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="font-semibold text-purple-700 text-sm">Ferie</span>
                      {selectedDateAttendance.is_manual && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                          Manuale
                        </Badge>
                      )}
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
                ) : selectedDateAttendance.is_sick_leave ? (
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="font-semibold text-orange-700 text-sm">Malattia</span>
                      {selectedDateAttendance.is_manual && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                          Manuale
                        </Badge>
                      )}
                    </div>
                    {selectedDateAttendance.notes && (
                      <div className="text-xs">
                        <span className="text-gray-600">Note:</span>
                        <div className="font-medium text-gray-800">
                          {selectedDateAttendance.notes}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-semibold text-green-700 text-sm">Presente</span>
                      {selectedDateAttendance.is_manual && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                          Manuale
                        </Badge>
                      )}
                      {selectedDateAttendance.is_business_trip && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                          Trasferta
                        </Badge>
                      )}
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
                      {selectedDateAttendance.notes && (
                        <div>
                          <span className="text-gray-600">Note:</span>
                          <div className="font-medium text-gray-800">
                            {selectedDateAttendance.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="font-semibold text-red-700 text-sm">Assente</span>
                </div>
                <p className="text-xs text-red-600">
                  {employee.tracking_start_type === 'from_year_start' 
                    ? 'Dipendente esistente - presenza da caricare manualmente'
                    : 'Nessuna presenza registrata per questo giorno lavorativo'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
