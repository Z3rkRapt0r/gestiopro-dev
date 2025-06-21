
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Users, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';

export default function NewDailyAttendanceCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { attendances, isLoading, deleteAttendance, isDeleting } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();

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

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  console.log('Data selezionata nel calendario:', selectedDateStr);
  console.log('Presenze disponibili:', attendances?.map(att => ({ date: att.date, user: att.profiles?.first_name })));
  
  const selectedDateAttendances = attendances?.filter(att => {
    console.log(`Confronto: ${att.date} === ${selectedDateStr} ?`, att.date === selectedDateStr);
    return att.date === selectedDateStr;
  }) || [];

  console.log('Presenze per la data selezionata:', selectedDateAttendances);

  const presentEmployees = selectedDateAttendances
    .filter(att => att.check_in_time && !att.is_sick_leave)
    .map(att => {
      const employee = employees?.find(emp => emp.id === att.user_id);
      return {
        ...employee,
        attendance: att,
      };
    })
    .filter(emp => emp.id);

  const sickEmployees = selectedDateAttendances
    .filter(att => att.is_sick_leave)
    .map(att => {
      const employee = employees?.find(emp => emp.id === att.user_id);
      return {
        ...employee,
        attendance: att,
      };
    })
    .filter(emp => emp.id);

  const absentEmployees = employees?.filter(emp => 
    !selectedDateAttendances.some(att => att.user_id === emp.id)
  ) || [];

  const getDayStatus = (dateStr: string) => {
    const dayAttendances = attendances?.filter(att => att.date === dateStr) || [];
    const totalEmployees = employees?.length || 0;
    
    if (totalEmployees === 0) return null;
    
    const presentCount = dayAttendances.filter(att => att.check_in_time && !att.is_sick_leave).length;
    const sickCount = dayAttendances.filter(att => att.is_sick_leave).length;
    const absentCount = totalEmployees - dayAttendances.length;
    
    if (presentCount === totalEmployees) return 'all-present';
    if (sickCount > 0) return 'has-sick';
    if (absentCount > 0 || presentCount < totalEmployees) return 'has-absent';
    
    return null;
  };

  const generateCalendarDates = () => {
    const today = new Date();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    const oneMonthForward = new Date(today);
    oneMonthForward.setMonth(today.getMonth() + 1);
    
    const dates = {
      allPresent: [],
      hasSick: [],
      hasAbsent: []
    };
    
    const tempDate = new Date(oneMonthAgo);
    while (tempDate <= oneMonthForward) {
      const dateStr = format(tempDate, 'yyyy-MM-dd');
      const dayOfWeek = tempDate.getDay();
      
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const status = getDayStatus(dateStr);
        const dateObj = new Date(tempDate);
        
        switch (status) {
          case 'all-present':
            dates.allPresent.push(dateObj);
            break;
          case 'has-sick':
            dates.hasSick.push(dateObj);
            break;
          case 'has-absent':
            dates.hasAbsent.push(dateObj);
            break;
        }
      }
      
      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    return dates;
  };

  const calendarDates = generateCalendarDates();

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    
    if (timeString.match(/^\d{2}:\d{2}$/)) {
      return timeString;
    }
    
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

  const handleDeleteAttendance = (attendance: any) => {
    if (confirm('Sei sicuro di voler eliminare questa presenza?')) {
      deleteAttendance(attendance);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Calendario */}
      <Card className="xl:col-span-1">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="w-5 h-5" />
            Calendario Generale
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                console.log('Nuova data selezionata:', date);
                setSelectedDate(date);
              }}
              locale={it}
              modifiers={{
                allPresent: calendarDates.allPresent,
                hasSick: calendarDates.hasSick,
                hasAbsent: calendarDates.hasAbsent
              }}
              modifiersStyles={{
                allPresent: {
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  fontWeight: 'bold'
                },
                hasSick: {
                  backgroundColor: '#f97316',
                  color: '#ffffff',
                  fontWeight: 'bold'
                },
                hasAbsent: {
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 'bold'
                }
              }}
              className="rounded-md border w-fit"
            />
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Tutti presenti</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>Giorni con malattie</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Giorni con assenze</span>
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
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-sm">
                              {employee.first_name} {employee.last_name}
                            </span>
                            {employee.attendance.is_manual && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                                Manuale
                              </Badge>
                            )}
                            {employee.attendance.is_business_trip && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                                Trasferta
                              </Badge>
                            )}
                          </div>
                          {employee.attendance.notes && (
                            <p className="text-xs text-gray-600 mt-1">{employee.attendance.notes}</p>
                          )}
                          <div className="text-xs text-gray-600 mt-1">
                            <div>Entrata: {formatTime(employee.attendance.check_in_time)}</div>
                            <div>Uscita: {formatTime(employee.attendance.check_out_time)}</div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAttendance(employee.attendance)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Nessun dipendente presente</p>
                )}
              </div>
            </div>

            {/* Dipendenti in Malattia */}
            <div>
              <h3 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                In Malattia ({sickEmployees.length})
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {sickEmployees.length > 0 ? (
                  sickEmployees.map((employee) => (
                    <div key={employee.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-sm">
                              {employee.first_name} {employee.last_name}
                            </span>
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                              Malattia
                            </Badge>
                          </div>
                          {employee.attendance.notes && (
                            <p className="text-xs text-gray-600 mt-1">{employee.attendance.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAttendance(employee.attendance)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Nessun dipendente in malattia</p>
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
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <span className="font-medium text-sm">
                            {employee.first_name} {employee.last_name}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Per i dipendenti assenti, non c'è una presenza da eliminare
                            // ma possiamo fornire feedback all'utente
                            alert('Non c\'è una presenza registrata da eliminare per questo dipendente.');
                          }}
                          className="text-gray-400 hover:text-gray-500 hover:bg-gray-50 ml-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Tutti i dipendenti sono presenti</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
