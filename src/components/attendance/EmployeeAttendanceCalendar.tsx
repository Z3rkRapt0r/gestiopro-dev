
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
  const { workSchedules } = useWorkSchedules();

  // Ottieni le presenze per la data selezionata
  const selectedDateStr = selectedDate?.toISOString().split('T')[0];
  const selectedDateAttendance = attendances.find(att => att.date === selectedDateStr);

  // Ottieni le date con presenze
  const attendanceDates = attendances
    .filter(att => att.check_in_time)
    .map(att => new Date(att.date));

  // Ottieni le date lavorative (basate sui work_schedules)
  const getWorkingDays = () => {
    if (!workSchedules || workSchedules.length === 0) return [];
    
    const schedule = workSchedules[0];
    const workingDays: number[] = [];
    
    if (schedule.monday) workingDays.push(1);
    if (schedule.tuesday) workingDays.push(2);
    if (schedule.wednesday) workingDays.push(3);
    if (schedule.thursday) workingDays.push(4);
    if (schedule.friday) workingDays.push(5);
    if (schedule.saturday) workingDays.push(6);
    if (schedule.sunday) workingDays.push(0);
    
    return workingDays;
  };

  const workingDays = getWorkingDays();

  // Genera le date lavorative per colorare il calendario
  const getWorkingDates = () => {
    const dates = [];
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (workingDays.includes(d.getDay())) {
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendario dell'operatore */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="w-5 h-5" />
            {employee.first_name} {employee.last_name}
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
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-green-200 rounded"></div>
              <span>Giorni di presenza</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-gray-200 rounded"></div>
              <span>Giorni lavorativi</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dettagli della data selezionata */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5" />
            Dettagli {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: it }) : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {selectedDateAttendance ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-semibold text-green-700">Presente</span>
                  {selectedDateAttendance.is_business_trip && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      Trasferta
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
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
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="font-semibold text-gray-700">
                  {workingDays.includes(selectedDate?.getDay() || 0) ? 'Assente' : 'Giorno non lavorativo'}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {workingDays.includes(selectedDate?.getDay() || 0) 
                  ? 'Nessuna presenza registrata per questo giorno'
                  : 'Questo giorno non è configurato come lavorativo'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
