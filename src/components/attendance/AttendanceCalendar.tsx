
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAttendances } from '@/hooks/useAttendances';
import { CalendarDays, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function AttendanceCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { attendances, isLoading } = useAttendances();

  // Filtra le presenze per la data selezionata
  const selectedDateAttendances = attendances?.filter(attendance => {
    if (!selectedDate) return false;
    const attendanceDate = new Date(attendance.date);
    return attendanceDate.toDateString() === selectedDate.toDateString();
  }) || [];

  // Calcola i giorni con presenze per evidenziarli nel calendario
  const daysWithAttendance = attendances?.map(attendance => new Date(attendance.date)) || [];

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
            <CalendarDays className="w-5 h-5" />
            Calendario Presenze
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={it}
            modifiers={{
              hasAttendance: daysWithAttendance,
            }}
            modifiersStyles={{
              hasAttendance: {
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                fontWeight: 'bold',
              },
            }}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Presenze del {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: it }) : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded"></div>
              ))}
            </div>
          ) : selectedDateAttendances.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedDateAttendances.map((attendance) => (
                <div key={attendance.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {attendance.profiles?.first_name} {attendance.profiles?.last_name}
                    </div>
                    {attendance.is_business_trip && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        Trasferta
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span>Entrata: <strong>{formatTime(attendance.check_in_time)}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-600" />
                      <span>Uscita: <strong>{formatTime(attendance.check_out_time)}</strong></span>
                    </div>
                  </div>
                  
                  {attendance.profiles?.email && (
                    <div className="text-xs text-gray-500">
                      {attendance.profiles.email}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nessuna presenza registrata per questo giorno</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
