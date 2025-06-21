
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

  // CORREZIONE: Formattiamo la data selezionata in modo consistente
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  console.log('Data selezionata calendario operatore:', selectedDateStr);
  console.log('Presenze operatore disponibili:', attendances?.map(att => ({ date: att.date, check_in: att.check_in_time })));
  
  const selectedDateAttendance = attendances.find(att => {
    console.log(`Confronto operatore: ${att.date} === ${selectedDateStr} ?`, att.date === selectedDateStr);
    return att.date === selectedDateStr;
  });

  console.log('Presenza operatore per data selezionata:', selectedDateAttendance);

  // CORREZIONE: Ottieni le date con presenze formattate correttamente
  const attendanceDates = attendances
    .filter(att => att.check_in_time || att.is_sick_leave)
    .map(att => {
      // Convertiamo la stringa data in oggetto Date senza problemi di timezone
      const [year, month, day] = att.date.split('-').map(Number);
      return new Date(year, month - 1, day); // month - 1 perché JavaScript usa mesi 0-based
    });

  const sickLeaveDates = attendances
    .filter(att => att.is_sick_leave)
    .map(att => {
      const [year, month, day] = att.date.split('-').map(Number);
      return new Date(year, month - 1, day);
    });

  // Calcola i giorni di assenza per questo operatore
  const currentDate = new Date();
  const oneMonthAgo = new Date(currentDate);
  oneMonthAgo.setMonth(currentDate.getMonth() - 1);
  
  const absentDates = [];
  const tempDate = new Date(oneMonthAgo);
  
  while (tempDate <= currentDate) {
    const dateStr = format(tempDate, 'yyyy-MM-dd');
    const hasAttendance = attendances.some(att => att.date === dateStr);
    
    // Se è un giorno lavorativo (lunedì-venerdì) e non ha presenza
    const dayOfWeek = tempDate.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && !hasAttendance && tempDate < currentDate) {
      absentDates.push(new Date(tempDate));
    }
    
    tempDate.setDate(tempDate.getDate() + 1);
  }

  console.log('Date con presenze per calendario operatore:', attendanceDates);

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    
    // Gestione semplice per il nuovo formato HH:MM
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
              onSelect={(date) => {
                console.log('Nuova data selezionata calendario operatore:', date);
                setSelectedDate(date);
              }}
              locale={it}
              modifiers={{
                present: attendanceDates,
                sickLeave: sickLeaveDates,
                absent: absentDates
              }}
              modifiersStyles={{
                present: {
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  fontWeight: 'bold'
                },
                sickLeave: {
                  backgroundColor: '#fed7aa',
                  color: '#ea580c',
                  fontWeight: 'bold'
                },
                absent: {
                  backgroundColor: '#fecaca',
                  color: '#dc2626',
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
              <div className="w-3 h-3 bg-orange-200 rounded"></div>
              <span>Giorni di malattia</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-red-200 rounded"></div>
              <span>Giorni di assenza</span>
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
              {selectedDateAttendance.is_sick_leave ? (
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
                Nessuna presenza registrata
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
