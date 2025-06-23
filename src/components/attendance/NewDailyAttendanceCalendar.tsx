
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
import { useWorkSchedules } from '@/hooks/useWorkSchedules';

export default function NewDailyAttendanceCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { attendances, isLoading, deleteAttendance, isDeleting } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const { workSchedule } = useWorkSchedules();

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
              className="rounded-md border w-fit"
            />
          </div>
          
          {/* Info giorni lavorativi */}
          {workSchedule && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-700 mb-2">Giorni Lavorativi:</div>
              <div className="text-xs text-blue-600 space-y-1">
                <div>Orari: {workSchedule.start_time} - {workSchedule.end_time}</div>
                <div className="flex flex-wrap gap-1">
                  {workSchedule.monday && <span className="bg-blue-100 px-1 rounded">Lun</span>}
                  {workSchedule.tuesday && <span className="bg-blue-100 px-1 rounded">Mar</span>}
                  {workSchedule.wednesday && <span className="bg-blue-100 px-1 rounded">Mer</span>}
                  {workSchedule.thursday && <span className="bg-blue-100 px-1 rounded">Gio</span>}
                  {workSchedule.friday && <span className="bg-blue-100 px-1 rounded">Ven</span>}
                  {workSchedule.saturday && <span className="bg-blue-100 px-1 rounded">Sab</span>}
                  {workSchedule.sunday && <span className="bg-blue-100 px-1 rounded">Dom</span>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dettagli presenze */}
      <Card className="xl:col-span-2">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            Presenze del {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: it }) : ''}
            {selectedDate && !isWorkingDay(selectedDate) && (
              <Badge variant="outline" className="bg-gray-50 text-gray-600 text-xs">
                Non lavorativo
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {selectedDate && !isWorkingDay(selectedDate) ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg mb-2">Giorno non lavorativo</div>
              <div className="text-gray-400 text-sm">
                Questo giorno non è configurato come giorno lavorativo
              </div>
            </div>
          ) : (
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
                        <span className="font-medium text-sm">
                          {employee.first_name} {employee.last_name}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Tutti i dipendenti sono presenti</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
