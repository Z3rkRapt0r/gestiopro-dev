
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
import PresentEmployeesSection from './sections/PresentEmployeesSection';
import AbsentEmployeesSection from './sections/AbsentEmployeesSection';
import LeaveEmployeesSection from './sections/LeaveEmployeesSection';

export default function DailyAttendanceCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { attendances, isLoading } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const { shouldTrackEmployeeOnDate } = useWorkingDaysTracking();
  const { leaveRequests } = useLeaveRequests();

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

  // Ottieni i dipendenti in ferie per la data selezionata
  const employeesOnLeave = relevantEmployeesForDate.filter(employee => {
    if (!leaveRequests) return false;
    
    return leaveRequests.some(request => {
      if (request.status !== 'approved' || request.user_id !== employee.id) return false;
      
      // Gestisci ferie (con date_from e date_to)
      if (request.type === 'ferie' && request.date_from && request.date_to) {
        return selectedDateStr >= request.date_from && selectedDateStr <= request.date_to;
      }
      
      // Gestisci permesso giornaliero (con day)
      if (request.type === 'permesso' && request.day && !request.time_from && !request.time_to) {
        return selectedDateStr === request.day;
      }
      
      return false;
    });
  });

  // Ottieni i dipendenti presenti
  const presentEmployees = selectedDateAttendances
    .filter(att => att.check_in_time)
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

  // Ottieni i dipendenti assenti (escludendo quelli in ferie e quelli presenti)
  const absentEmployees = relevantEmployeesForDate.filter(emp => {
    const hasAttendance = selectedDateAttendances.some(att => att.user_id === emp.id && att.check_in_time);
    const isOnLeave = employeesOnLeave.some(leaveEmp => leaveEmp.id === emp.id);
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
    
    // Se è già in formato HH:MM, restituiscilo così com'è
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // Altrimenti prova a parsarlo come timestamp
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
              <PresentEmployeesSection employees={presentEmployees} />
            </div>

            {/* Dipendenti in Ferie */}
            <div>
              <LeaveEmployeesSection 
                employees={employeesOnLeave} 
                leaveRequests={leaveRequests || []}
                selectedDate={selectedDateStr || ''}
              />
            </div>

            {/* Dipendenti Assenti */}
            <div>
              <AbsentEmployeesSection employees={absentEmployees} />

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
