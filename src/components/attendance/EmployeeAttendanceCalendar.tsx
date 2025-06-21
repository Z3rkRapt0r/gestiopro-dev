
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import type { Attendance } from '@/hooks/useAttendances';
import type { EmployeeProfile } from '@/hooks/useActiveEmployees';

interface EmployeeAttendanceCalendarProps {
  employee: EmployeeProfile;
  attendances: Attendance[];
}

export default function EmployeeAttendanceCalendar({ employee, attendances }: EmployeeAttendanceCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { workSchedule } = useWorkSchedules();

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

  // Ottieni le presenze per la data selezionata
  const selectedDateStr = selectedDate?.toISOString().split('T')[0];
  const selectedDateAttendance = attendances.find(att => att.date === selectedDateStr);

  // Ottieni le date con presenze
  const attendanceDates = attendances
    .filter(att => att.check_in_time)
    .map(att => new Date(att.date));

  // Genera le date lavorative (basate sui work_schedules)
  const getWorkingDates = () => {
    const dates = [];
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (isWorkingDay(d)) {
        dates.push(new Date(d));
      }
    }
    return dates;
  };

  const workingDates = getWorkingDates();

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    return new Date(timeString).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Calendario dell'operatore */}
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
                present: attendanceDates,
                workingDay: workingDates
              }}
              modifiersStyles={{
                present: {
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  fontWeight: 'bold'
                },
                workingDay: {
                  backgroundColor: '#f3f4f6',
                  color: '#374151'
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
              <div className="w-3 h-3 bg-gray-200 rounded"></div>
              <span>Giorni lavorativi</span>
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
          ) : selectedDateAttendance ? (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-semibold text-green-700 text-sm">Presente</span>
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
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="font-semibold text-red-700 text-sm">Assente</span>
              </div>
              <p className="text-xs text-red-600">
                Nessuna presenza registrata per questo giorno lavorativo
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
