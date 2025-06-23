import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useWorkingDaysTracking } from '@/hooks/useWorkingDaysTracking';
import type { UnifiedAttendance } from '@/hooks/useUnifiedAttendances';
import type { EmployeeProfile } from '@/hooks/useActiveEmployees';

interface NewEmployeeAttendanceCalendarProps {
  employee: EmployeeProfile;
  attendances: UnifiedAttendance[];
}

export default function NewEmployeeAttendanceCalendar({ employee, attendances }: NewEmployeeAttendanceCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { workSchedule } = useWorkSchedules();
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

  // CORREZIONE: Formattiamo la data selezionata in modo consistente
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  console.log('Data selezionata calendario operatore:', selectedDateStr);
  console.log('Presenze operatore disponibili:', attendances?.map(att => ({ date: att.date, check_in: att.check_in_time })));
  
  const selectedDateAttendance = attendances.find(att => {
    console.log(`Confronto operatore: ${att.date} === ${selectedDateStr} ?`, att.date === selectedDateStr);
    return att.date === selectedDateStr;
  });

  console.log('Presenza operatore per data selezionata:', selectedDateAttendance);

  // NUOVO: Calcola il resoconto annuale basato sui giorni lavorativi che dovrebbero essere tracciati
  const calculateYearlyStats = async () => {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const today = new Date();
    
    // Filtra le presenze dell'anno corrente
    const yearAttendances = attendances.filter(att => {
      const attDate = new Date(att.date);
      return attDate >= startOfYear && attDate <= today;
    });
    
    // Conta i giorni lavorativi che dovrebbero essere tracciati usando la logica centralizzata
    let workingDaysCount = 0;
    const tempDate = new Date(startOfYear);
    
    while (tempDate <= today) {
      if (isWorkingDay(tempDate)) {
        const dateStr = format(tempDate, 'yyyy-MM-dd');
        const shouldTrack = await shouldTrackEmployeeOnDate(employee.id, dateStr);
        if (shouldTrack) {
          workingDaysCount++;
        }
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    const presentDays = yearAttendances.filter(att => att.check_in_time && !att.is_sick_leave).length;
    const sickDays = yearAttendances.filter(att => att.is_sick_leave).length;
    const absentDays = Math.max(0, workingDaysCount - yearAttendances.length);
    
    return {
      totalWorkingDays: workingDaysCount,
      presentDays,
      sickDays,
      absentDays,
      attendancePercentage: workingDaysCount > 0 ? Math.round((presentDays / workingDaysCount) * 100) : 0
    };
  };

  const [yearlyStats, setYearlyStats] = useState({
    totalWorkingDays: 0,
    presentDays: 0,
    sickDays: 0,
    absentDays: 0,
    attendancePercentage: 0
  });

  // Calcola le statistiche quando il componente si monta
  React.useEffect(() => {
    calculateYearlyStats().then(setYearlyStats);
  }, [employee.id, attendances]);

  // CORREZIONE: Ottieni le date con presenze formattate correttamente
  const attendanceDates = attendances
    .filter(att => att.check_in_time || att.is_sick_leave)
    .map(att => {
      const [year, month, day] = att.date.split('-').map(Number);
      return new Date(year, month - 1, day);
    });

  const sickLeaveDates = attendances
    .filter(att => att.is_sick_leave)
    .map(att => {
      const [year, month, day] = att.date.split('-').map(Number);
      return new Date(year, month - 1, day);
    });

  // Calcola i giorni di assenza basandosi sulla logica centralizzata
  const getAbsentDates = async () => {
    const currentDate = new Date();
    const oneMonthAgo = new Date(currentDate);
    oneMonthAgo.setMonth(currentDate.getMonth() - 1);
    
    const absentDates = [];
    const tempDate = new Date(oneMonthAgo);
    
    while (tempDate <= currentDate) {
      const dateStr = format(tempDate, 'yyyy-MM-dd');
      const hasAttendance = attendances.some(att => att.date === dateStr);
      const shouldTrack = await shouldTrackEmployeeOnDate(employee.id, dateStr);
      
      // Se dovrebbe essere tracciato, è un giorno lavorativo e non ha presenza
      if (shouldTrack && isWorkingDay(tempDate) && !hasAttendance && tempDate < currentDate) {
        absentDates.push(new Date(tempDate));
      }
      
      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    return absentDates;
  };

  const [absentDates, setAbsentDates] = useState<Date[]>([]);

  React.useEffect(() => {
    getAbsentDates().then(setAbsentDates);
  }, [employee.id, attendances]);

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

  // Verifica se una data dovrebbe essere tracciata per questo dipendente
  const shouldShowDate = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return await shouldTrackEmployeeOnDate(employee.id, dateStr);
  };

  return (
    <div className="space-y-6">
      {/* Resoconto Annuale */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="w-4 h-4" />
            Resoconto Annuale {new Date().getFullYear()}
            <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
              {employee.tracking_start_type === 'from_hire_date' ? 'Nuovo Dipendente' : 'Dipendente Esistente'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">{yearlyStats.totalWorkingDays}</div>
              <div className="text-sm text-blue-600">Giorni Lavorativi</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">{yearlyStats.presentDays}</div>
              <div className="text-sm text-green-600">Giorni Presenti</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-700">{yearlyStats.sickDays}</div>
              <div className="text-sm text-orange-600">Giorni Malattia</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-700">{yearlyStats.absentDays}</div>
              <div className="text-sm text-red-600">Giorni Assenti</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-lg font-semibold">
              Percentuale Presenza: <span className="text-blue-700">{yearlyStats.attendancePercentage}%</span>
            </div>
          </div>
          
          {/* Info configurazione */}
          {workSchedule && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-700 mb-2">Configurazione Orari:</div>
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

          {/* Info sul tipo di tracciamento */}
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-xs font-medium text-yellow-700 mb-1">
              Tipo di tracciamento: {employee.tracking_start_type === 'from_hire_date' ? 'Nuovo dipendente' : 'Dipendente esistente'}
            </div>
            <div className="text-xs text-yellow-600">
              {employee.tracking_start_type === 'from_hire_date' 
                ? `Tracciamento dal ${employee.hire_date ? format(new Date(employee.hire_date), 'dd/MM/yyyy') : 'N/A'} (data di creazione)` 
                : 'Tracciamento dall\'inizio dell\'anno - le assenze devono essere caricate manualmente'
              }
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendario dell'operatore */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                  present: attendanceDates.filter(date => !sickLeaveDates.some(sickDate => 
                    sickDate.getTime() === date.getTime()
                  )),
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
                    color: '#9a3412',
                    fontWeight: 'bold'
                  },
                  absent: {
                    backgroundColor: '#fecaca',
                    color: '#991b1b',
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
                  Questo giorno non è configurato come giorno lavorativo
                </p>
              </div>
            ) : selectedDateAttendance ? (
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
                  <span className="font-semibold text-red-700 text-sm">
                    {selectedDate && employee.tracking_start_type === 'from_hire_date' && employee.hire_date && selectedDate < new Date(employee.hire_date) 
                      ? 'Non ancora assunto' 
                      : 'Assente'
                    }
                  </span>
                </div>
                <p className="text-xs text-red-600">
                  {selectedDate && employee.tracking_start_type === 'from_hire_date' && employee.hire_date && selectedDate < new Date(employee.hire_date)
                    ? `Il dipendente è stato assunto il ${format(new Date(employee.hire_date), 'dd/MM/yyyy')}`
                    : 'Nessuna presenza registrata per questo giorno lavorativo'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
