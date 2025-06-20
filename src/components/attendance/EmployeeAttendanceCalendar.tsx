
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

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
  for (let d = new Date(oneMonthAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay(); // 0 = domenica, 6 = sabato
    
    // Considera solo i giorni feriali (lunedì-venerdì)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const hasAttendance = employeeAttendances.some(att => att.date === dateStr && att.check_in_time);
      if (!hasAttendance) {
        absentDays.push(new Date(d));
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
              },
              absent: {
                backgroundColor: '#fecaca',
                color: '#dc2626',
                fontWeight: 'bold',
              },
            }}
            className="rounded-md border"
          />
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-200 rounded"></div>
              <span className="text-sm">Giorni di presenza</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-200 rounded"></div>
              <span className="text-sm">Giorni di assenza</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Dettagli del {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: it }) : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateAttendance ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Entrata</label>
                  <div className="text-lg font-semibold text-green-600">
                    {formatTime(selectedDateAttendance.check_in_time)}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Uscita</label>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatTime(selectedDateAttendance.check_out_time)}
                  </div>
                </div>
              </div>
              
              {selectedDateAttendance.is_business_trip && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  Trasferta
                </Badge>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nessuna presenza registrata per questo giorno</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
