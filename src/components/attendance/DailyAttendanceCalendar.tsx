import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useWorkingDaysTracking } from '@/hooks/useWorkingDaysTracking';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';

export default function DailyAttendanceCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { attendances, isLoading } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const { leaveRequests } = useLeaveRequests();
  const { shouldTrackEmployeeOnDate } = useWorkingDaysTracking();

  if (isLoading) {
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

  // Ottieni le presenze per la data selezionata
  const selectedDateStr = selectedDate?.toISOString().split('T')[0];
  const selectedDateAttendances = attendances?.filter(att => att.date === selectedDateStr) || [];

  // Migliora la logica per ottenere le ferie approvate per la data selezionata
  const selectedDateLeaves = leaveRequests?.filter(request => {
    if (request.status !== 'approved') return false;
    
    if (request.type === 'ferie' && request.date_from && request.date_to && selectedDateStr) {
      // Normalizza le date a formato YYYY-MM-DD per confronto diretto
      const leaveStartStr = request.date_from;
      const leaveEndStr = request.date_to;
      
      console.log(`Confronto ferie per dipendente ${request.user_id}:`, {
        selectedDate: selectedDateStr,
        leaveStart: leaveStartStr,
        leaveEnd: leaveEndStr,
        isInRange: selectedDateStr >= leaveStartStr && selectedDateStr <= leaveEndStr
      });
      
      // Confronto diretto tra stringhe in formato YYYY-MM-DD
      return selectedDateStr >= leaveStartStr && selectedDateStr <= leaveEndStr;
    }
    
    return false;
  }) || [];

  console.log('Data selezionata:', selectedDateStr);
  console.log('Ferie approvate per questa data:', selectedDateLeaves);

  // Funzione per filtrare i dipendenti che dovrebbero essere tracciati per la data selezionata
  const getRelevantEmployeesForDate = async (dateStr: string) => {
    if (!employees) return [];
    
    const relevantEmployees = [];
    for (const emp of employees) {
      const shouldTrack = await shouldTrackEmployeeOnDate(emp.id, dateStr);
      if (shouldTrack) {
        relevantEmployees.push(emp);
      }
    }
    return relevantEmployees;
  };

  const [relevantEmployeesForDate, setRelevantEmployeesForDate] = useState<any[]>([]);

  React.useEffect(() => {
    if (selectedDateStr) {
      getRelevantEmployeesForDate(selectedDateStr).then(setRelevantEmployeesForDate);
    }
  }, [selectedDateStr, employees]);

  // Ottieni i dipendenti presenti
  const presentEmployees = selectedDateAttendances
    .filter(att => att.check_in_time && !att.is_sick_leave)
    .map(att => {
      const employee = relevantEmployeesForDate.find(emp => emp.id === att.user_id);
      return employee ? {
        ...employee,
        check_in_time: att.check_in_time,
        check_out_time: att.check_out_time,
        is_business_trip: att.is_business_trip,
        is_sick_leave: att.is_sick_leave
      } : null;
    })
    .filter(emp => emp !== null);

  // Ottieni i dipendenti in ferie
  const onLeaveEmployees = selectedDateLeaves.map(leave => {
    const employee = employees?.find(emp => emp.id === leave.user_id);
    console.log(`Dipendente in ferie trovato:`, {
      employeeId: leave.user_id,
      employee: employee ? `${employee.first_name} ${employee.last_name}` : 'non trovato'
    });
    return employee ? {
      ...employee,
      leave: leave
    } : null;
  }).filter(emp => emp !== null);

  // Ottieni i dipendenti assenti (escludendo quelli in ferie e quelli presenti)
  const absentEmployees = relevantEmployeesForDate.filter(emp => {
    const hasAttendance = selectedDateAttendances.some(att => att.user_id === emp.id && att.check_in_time);
    const isOnLeave = selectedDateLeaves.some(leave => leave.user_id === emp.id);
    
    console.log(`Dipendente ${emp.first_name} ${emp.last_name} (ID: ${emp.id}):`, {
      hasAttendance,
      isOnLeave,
      shouldBeAbsent: !hasAttendance && !isOnLeave
    });
    
    return !hasAttendance && !isOnLeave;
  });

  // Ottieni i dipendenti non ancora assunti per questa data
  const notYetHiredEmployees = employees?.filter(emp => 
    selectedDate && emp.hire_date && emp.tracking_start_type === 'from_hire_date' && 
    new Date(selectedDate) < new Date(emp.hire_date)
  ) || [];

  // Ottieni le date con presenze per evidenziarle nel calendario
  const datesWithAttendance = attendances?.filter(att => att.check_in_time).map(att => new Date(att.date)) || [];

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    return new Date(timeString).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Calendario */}
      <Card className="xl:col-span-1">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="w-5 h-5" />
            Calendario Presenze Generale
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={it}
              modifiers={{
                hasAttendance: datesWithAttendance
              }}
              modifiersStyles={{
                hasAttendance: {
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  fontWeight: 'bold'
                }
              }}
              className="rounded-md border w-fit"
            />
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-green-200 rounded"></div>
              <span>Giorni con presenze</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dettagli presenze */}
      <Card className="xl:col-span-2">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            Presenze del {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: it }) : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dipendenti Presenti */}
            <div>
              <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Presenti ({presentEmployees.length})
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {presentEmployees.length > 0 ? (
                  presentEmployees.map((employee) => (
                    <div key={employee.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <span className="font-medium text-sm">
                            {employee.first_name} {employee.last_name}
                          </span>
                          {employee.is_business_trip && (
                            <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 text-xs">
                              Trasferta
                            </Badge>
                          )}
                          {employee.is_sick_leave && (
                            <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 text-xs">
                              Malattia
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 text-right">
                          <div>{formatTime(employee.check_in_time)}</div>
                          <div>{formatTime(employee.check_out_time)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Nessun dipendente presente</p>
                )}
              </div>
            </div>

            {/* Dipendenti in Ferie */}
            <div>
              <h3 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                In Ferie ({onLeaveEmployees.length})
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {onLeaveEmployees.length > 0 ? (
                  onLeaveEmployees.map((employee) => (
                    <div key={employee.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <span className="font-medium text-sm">
                            {employee.first_name} {employee.last_name}
                          </span>
                          <Badge variant="outline" className="ml-2 bg-purple-50 text-purple-700 text-xs">
                            Ferie
                          </Badge>
                          {employee.leave?.note && (
                            <p className="text-xs text-gray-600 mt-1">{employee.leave.note}</p>
                          )}
                          {employee.leave?.date_from && employee.leave.date_to && (
                            <div className="text-xs text-purple-600 mt-1">
                              {format(new Date(employee.leave.date_from), 'dd/MM')} - {format(new Date(employee.leave.date_to), 'dd/MM')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Nessun dipendente in ferie</p>
                )}
              </div>
            </div>

            {/* Dipendenti Assenti */}
            <div>
              <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                Assenti ({absentEmployees.length})
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {absentEmployees.length > 0 ? (
                  absentEmployees.map((employee) => (
                    <div key={employee.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">
                          {employee.first_name} {employee.last_name}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Tutti i dipendenti rilevanti sono giustificati</p>
                )}
              </div>

              {/* Dipendenti non ancora assunti */}
              {notYetHiredEmployees.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-600 mb-2 text-sm">
                    Non ancora assunti alla data ({notYetHiredEmployees.length})
                  </h4>
                  <div className="space-y-1">
                    {notYetHiredEmployees.map((employee) => (
                      <div key={employee.id} className="p-2 bg-gray-50 rounded border border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {employee.first_name} {employee.last_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            Assunto: {employee.hire_date ? format(new Date(employee.hire_date), 'dd/MM/yyyy') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
