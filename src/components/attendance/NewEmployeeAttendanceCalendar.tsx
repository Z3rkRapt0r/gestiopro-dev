
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import type { UnifiedAttendance } from '@/hooks/useUnifiedAttendances';
import type { EmployeeProfile } from '@/hooks/useActiveEmployees';

interface NewEmployeeAttendanceCalendarProps {
  employee: EmployeeProfile;
  attendances: UnifiedAttendance[];
}

export default function NewEmployeeAttendanceCalendar({ employee, attendances }: NewEmployeeAttendanceCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { workSchedule } = useWorkSchedules();

  // Ottieni le presenze per la data selezionata
  const selectedDateStr = selectedDate?.toISOString().split('T')[0];
  const selectedDateAttendance = attendances.find(att => att.date === selectedDateStr);

  // Ottieni le date con presenze
  const attendanceDates = attendances
    .filter(att => att.check_in_time)
    .map(att => new Date(att.date));

  // Ottieni le date lavorative (basate sui work_schedules)
  const getWorkingDays = () => {
    if (!workSchedule) return [];
    
    const workingDays: number[] = [];
    
    if (workSchedule.monday) workingDays.push(1);
    if (workSchedule.tuesday) workingDays.push(2);
    if (workSchedule.wednesday) workingDays.push(3);
    if (workSchedule.thursday) workingDays.push(4);
    if (workSchedule.friday) workingDays.push(5);
    if (workSchedule.saturday) workingDays.push(6);
    if (workSchedule.sunday) workingDays.push(0);
    
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
    
    // Se il timestamp è nel formato ISO locale (YYYY-MM-DDTHH:mm:ss)
    if (timeString.includes('T') && !timeString.includes('Z') && !timeString.includes('+')) {
      const [, timePart] = timeString.split('T');
      const [hours, minutes] = timePart.split(':');
      return `${hours}:${minutes}`;
    }
    
    // Se è nel formato "YYYY-MM-DD HH:mm:ss"
    if (timeString.includes(' ')) {
      const [, timePart] = timeString.split(' ');
      const [hours, minutes] = timePart.split(':');
      return `${hours}:${minutes}`;
    }
    
    // Fallback per altri formati
    try {
      return new Date(timeString).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Errore nel parsing del timestamp:', timeString, error);
      return '--:--';
    }
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
        </CardContent>
      </Card>

      {/* Dettagli della data selezionata */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4" />
            Dettagli {selectedDate ? format(selectedDate, 'dd/MM', { locale: it }) : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {selectedDateAttendance ? (
            <div className="space-y-3">
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
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="font-semibold text-gray-700 text-sm">
                  {workingDays.includes(selectedDate?.getDay() || 0) ? 'Assente' : 'Non lavorativo'}
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {workingDays.includes(selectedDate?.getDay() || 0) 
                  ? 'Nessuna presenza registrata'
                  : 'Giorno non lavorativo'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
