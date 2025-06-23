import React, { useState } from 'react';
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
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useWorkingDaysTracking } from '@/hooks/useWorkingDaysTracking';

export default function NewDailyAttendanceCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [absentEmployees, setAbsentEmployees] = useState<any[]>([]);
  
  const { attendances, isLoading, deleteAttendance, isDeleting } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const { workSchedule } = useWorkSchedules();
  const { leaveRequests } = useLeaveRequests();
  const { shouldTrackEmployeeOnDate } = useWorkingDaysTracking();

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

  // CORREZIONE: Filtra correttamente gli assenti usando la logica del working_days_tracking
  const getAbsentEmployees = async () => {
    if (!selectedDate || !employees) return [];
    
    const absentEmployees = [];
    
    for (const emp of employees) {
      // Verifica se ha già una presenza registrata
      const hasAttendance = selectedDateAttendances.some(att => att.user_id === emp.id);
      if (hasAttendance) continue;
      
      // Verifica se è in ferie
      const isOnLeave = selectedDateLeaves.some(leave => leave.user_id === emp.id);
      if (isOnLeave) continue;
      
      // Verifica se dovrebbe essere tracciato per questa data usando la logica centralizzata
      const shouldTrack = await shouldTrackEmployeeOnDate(emp.id, selectedDateStr);
      if (shouldTrack && isWorkingDay(selectedDate)) {
        absentEmployees.push(emp);
      }
    }
    
    return absentEmployees;
  };

  React.useEffect(() => {
    if (selectedDateStr && employees && attendances) {
      getAbsentEmployees().then(setAbsentEmployees);
    }
  }, [selectedDateStr, employees, attendances]);

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

  console.log('Data selezionata nel calendario:', selectedDateStr);
  console.log('Presenze disponibili:', attendances?.map(att => ({ date: att.date, user: att.profiles?.first_name })));
  
  const selectedDateAttendances = attendances?.filter(att => {
    console.log(`Confronto: ${att.date} === ${selectedDateStr} ?`, att.date === selectedDateStr);
    return att.date === selectedDateStr;
  }) || [];

  console.log('Presenze per la data selezionata:', selectedDateAttendances);

  // CORREZIONE: Ottieni le richieste di ferie approvate per la data selezionata
  const selectedDateLeaves = leaveRequests?.filter(request => {
    if (request.status !== 'approved') return false;
    
    if (request.type === 'ferie' && request.date_from && request.date_to) {
      const leaveStart = new Date(request.date_from);
      const leaveEnd = new Date(request.date_to);
      const currentDate = selectedDate ? new Date(selectedDate) : new Date();
      return currentDate >= leaveStart && currentDate <= leaveEnd;
    }
    
    if (request.type === 'permesso' && request.day) {
      return request.day === selectedDateStr;
    }
    
    return false;
  }) || [];

  // CORREZIONE: Dipendenti presenti fisicamente (NON in ferie e NON in malattia)
  const presentEmployees = selectedDateAttendances
    .filter(att => {
      // Ha check-in e non è in malattia
      if (!att.check_in_time || att.is_sick_leave) return false;
      
      // NON deve essere marcato come "Ferie" o "Permesso" (presenza fisica)
      if (att.notes === 'Ferie' || att.notes === 'Permesso') return false;
      
      return true;
    })
    .map(att => {
      const employee = employees?.find(emp => emp.id === att.user_id);
      return {
        ...employee,
        attendance: att,
      };
    })
    .filter(emp => emp.id);

  // Dipendenti in malattia
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

  // CORREZIONE: Dipendenti in ferie - prima controlla le richieste di ferie approvate
  const onLeaveEmployees = [];

  // Per ogni dipendente, controlla se è in ferie per la data selezionata
  employees?.forEach(employee => {
    // Cerca una richiesta di ferie approvata che copre questa data
    const activeLeave = selectedDateLeaves.find(leave => 
      leave.type === 'ferie' && leave.user_id === employee.id
    );
    
    if (activeLeave) {
      // Cerca se esiste una presenza automatica per questo dipendente
      const automaticAttendance = selectedDateAttendances.find(att => 
        att.user_id === employee.id && att.notes === 'Ferie'
      );
      
      onLeaveEmployees.push({
        ...employee,
        attendance: automaticAttendance || null,
        leave: activeLeave, // Sempre presente per mostrare il periodo
      });
    } else {
      // Se non c'è una richiesta di ferie ma c'è una presenza con note "Ferie"
      const ferieAttendance = selectedDateAttendances.find(att => 
        att.user_id === employee.id && att.notes === 'Ferie'
      );
      
      if (ferieAttendance) {
        // Cerca una richiesta di ferie che potrebbe coprire questa data (anche se non perfettamente matchata)
        const relatedLeave = leaveRequests?.find(leave => 
          leave.type === 'ferie' && 
          leave.user_id === employee.id && 
          leave.status === 'approved' &&
          leave.date_from && 
          leave.date_to
        );
        
        onLeaveEmployees.push({
          ...employee,
          attendance: ferieAttendance,
          leave: relatedLeave || null,
        });
      }
    }
  });

  // CORREZIONE: Dipendenti con permessi giornalieri
  const onPermissionEmployees = [];
  
  selectedDateLeaves.forEach(leave => {
    if (leave.type === 'permesso' && leave.day && !leave.time_from && !leave.time_to) {
      const employee = employees?.find(emp => emp.id === leave.user_id);
      if (employee) {
        // Cerca se esiste una presenza automatica per questo dipendente
        const automaticAttendance = selectedDateAttendances.find(att => 
          att.user_id === leave.user_id && att.notes === 'Permesso'
        );
        
        onPermissionEmployees.push({
          ...employee,
          attendance: automaticAttendance || null,
          leave: leave,
        });
      }
    }
  });

  // Se non ci sono dipendenti con permessi dalle richieste, controlla le presenze con note "Permesso"
  if (onPermissionEmployees.length === 0) {
    const permissionAttendances = selectedDateAttendances.filter(att => att.notes === 'Permesso');
    permissionAttendances.forEach(att => {
      const employee = employees?.find(emp => emp.id === att.user_id);
      if (employee && !onLeaveEmployees.some(emp => emp.id === employee.id)) { // Non duplicare se già in ferie
        const leaveRequest = selectedDateLeaves.find(leave => leave.user_id === att.user_id);
        onPermissionEmployees.push({
          ...employee,
          attendance: att,
          leave: leaveRequest || null,
        });
      }
    });
  }

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
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-6">
              {/* Dipendenti Presenti FISICAMENTE */}
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
                              {employee.tracking_start_type === 'from_year_start' && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                                  Esistente
                                </Badge>
                              )}
                              {employee.tracking_start_type === 'from_hire_date' && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                                  Nuovo
                                </Badge>
                              )}
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
                            {employee.attendance.notes && employee.attendance.notes !== 'Ferie' && (
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
                    <p className="text-gray-500 text-sm">Nessun dipendente presente fisicamente</p>
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

              {/* Dipendenti in Ferie */}
              <div>
                <h3 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  In Ferie ({onLeaveEmployees.length})
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {onLeaveEmployees.length > 0 ? (
                    onLeaveEmployees.map((employee) => (
                      <div key={employee.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-medium text-sm">
                                {employee.first_name} {employee.last_name}
                              </span>
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                                Ferie
                              </Badge>
                            </div>
                            {employee.leave?.note && (
                              <p className="text-xs text-gray-600 mt-1">{employee.leave.note}</p>
                            )}
                            {employee.leave?.date_from && employee.leave.date_to && (
                              <div className="text-xs text-purple-600 mt-1 font-medium">
                                Periodo: {format(new Date(employee.leave.date_from), 'dd/MM/yyyy')} - {format(new Date(employee.leave.date_to), 'dd/MM/yyyy')}
                              </div>
                            )}
                          </div>
                          {employee.attendance && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAttendance(employee.attendance)}
                              disabled={isDeleting}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Nessun dipendente in ferie</p>
                  )}
                </div>
              </div>

              {/* Dipendenti in Permesso */}
              <div>
                <h3 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  In Permesso ({onPermissionEmployees.length})
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {onPermissionEmployees.length > 0 ? (
                    onPermissionEmployees.map((employee) => (
                      <div key={employee.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-medium text-sm">
                                {employee.first_name} {employee.last_name}
                              </span>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                                {employee.permissionType === 'orario' ? 'Permesso Orario' : 'Permesso'}
                              </Badge>
                            </div>
                            {employee.attendance?.notes && (
                              <p className="text-xs text-gray-600 mt-1">{employee.attendance.notes}</p>
                            )}
                            {employee.permissionType === 'orario' && employee.attendance && (
                              <div className="text-xs text-blue-600 mt-1 font-medium">
                                {employee.attendance.check_in_time && employee.attendance.check_out_time ? (
                                  `Orario: ${formatTime(employee.attendance.check_in_time)} - ${formatTime(employee.attendance.check_out_time)}`
                                ) : (
                                  'Orario da definire'
                                )}
                              </div>
                            )}
                            {employee.leave?.note && (
                              <p className="text-xs text-gray-600 mt-1">{employee.leave.note}</p>
                            )}
                          </div>
                          {employee.attendance && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAttendance(employee.attendance)}
                              disabled={isDeleting}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Nessun dipendente in permesso</p>
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
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">
                            {employee.first_name} {employee.last_name}
                          </span>
                          <div className="flex gap-1">
                            {employee.tracking_start_type === 'from_year_start' && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                                Da caricare manualmente
                              </Badge>
                            )}
                            {employee.tracking_start_type === 'from_hire_date' && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                                Nuovo dipendente
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Tutti i dipendenti rilevanti sono giustificati</p>
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
