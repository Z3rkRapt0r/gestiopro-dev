
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';

interface Attendance {
  id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  is_business_trip: boolean | null;
}

interface Props {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  attendances: Attendance[];
}

export default function EmployeeAttendanceCalendar({ employee, attendances }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { workSchedule } = useWorkSchedules();

  // Filtra le presenze per questo dipendente
  const employeeAttendances = attendances.filter(att => att.date);
  
  // Ottieni le date con presenza
  const presentDays = employeeAttendances
    .filter(att => att.check_in_time)
    .map(att => new Date(att.date));

  // Ottieni le date senza presenza (giorni lavorativi passati)
  const today = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(today.getMonth() - 1);
  
  const absentDays: Date[] = [];
  
  if (workSchedule) {
    for (let d = new Date(oneMonthAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay(); // 0 = domenica, 6 = sabato
      
      // Verifica se è un giorno lavorativo secondo il work_schedule
      const isWorkingDay = (
        (dayOfWeek === 1 && workSchedule.monday) ||
        (dayOfWeek === 2 && workSchedule.tuesday) ||
        (dayOfWeek === 3 && workSchedule.wednesday) ||
        (dayOfWeek === 4 && workSchedule.thursday) ||
        (dayOfWeek === 5 && workSchedule.friday) ||
        (dayOfWeek === 6 && workSchedule.saturday) ||
        (dayOfWeek === 0 && workSchedule.sunday)
      );
      
      if (isWorkingDay) {
        const hasAttendance = employeeAttendances.some(att => att.date === dateStr && att.check_in_time);
        if (!hasAttendance) {
          absentDays.push(new Date(d));
        }
      }
    }
  }

  // Trova la presenza per la data selezionata
  const selectedDateAttendance = selectedDate 
    ? employeeAttendances.find(att => {
        const attDate = new Date(att.date);
        return attDate.toDateString() === selectedDate.toDateString();
      })
    : null;

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    return new Date(timeString).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5" />
            {employee.first_name} {employee.last_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={it}
            modifiers={{
              present: presentDays,
              absent: absentDays,
            }}
            modifiersStyles={{
              present: {
                backgroundColor: '#dcfce7',
                color: '#166534',
                fontWeight: 'bold',
                border: '2px solid #16a34a',
              },
              absent: {
                backgroundColor: '#fecaca',
                color: '#dc2626',
                fontWeight: 'bold',
                border: '2px solid #dc2626',
              },
            }}
            className="rounded-md border shadow-sm"
          />
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-200 border-2 border-green-500 rounded"></div>
              <span className="text-sm font-medium">Giorni di presenza</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-200 border-2 border-red-500 rounded"></div>
              <span className="text-sm font-medium">Giorni di assenza</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5" />
            Dettagli del {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: it }) : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateAttendance ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-600 block">Entrata</label>
                  <div className="text-2xl font-bold text-green-600 p-3 bg-green-50 rounded-lg border border-green-200">
                    {formatTime(selectedDateAttendance.check_in_time)}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-600 block">Uscita</label>
                  <div className="text-2xl font-bold text-blue-600 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    {formatTime(selectedDateAttendance.check_out_time)}
                  </div>
                </div>
              </div>
              
              {selectedDateAttendance.is_business_trip && (
                <div className="mt-4">
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 px-3 py-1">
                    Trasferta
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Nessuna presenza registrata</p>
              <p className="text-sm">per questo giorno</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
