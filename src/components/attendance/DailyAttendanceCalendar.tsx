
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAttendances } from '@/hooks/useAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';

export default function DailyAttendanceCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { attendances, isLoading } = useAttendances();
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

  // Funzione per verificare se un dipendente dovrebbe essere considerato "presente" in una data
  const shouldEmployeeBeConsidered = (employee: any, date: Date) => {
    if (!employee.hire_date) return true; // Se non ha data di assunzione, considera sempre
    
    const hireDate = new Date(employee.hire_date);
    const selectedDateObj = new Date(date);
    
    // LOGICA CORRETTA: Per dipendenti nuovi (from_hire_date), non considerarlo prima della data di assunzione
    if (employee.tracking_start_type === 'from_hire_date') {
      return selectedDateObj >= hireDate;
    }
    
    // Per dipendenti esistenti (from_year_start), consideralo sempre per mostrare le assenze
    return true;
  };

  // Ottieni le presenze per la data selezionata
  const selectedDateStr = selectedDate?.toISOString().split('T')[0];
  const selectedDateAttendances = attendances?.filter(att => att.date === selectedDateStr) || [];

  // Filtra i dipendenti che dovrebbero essere considerati per la data selezionata
  const relevantEmployeesForDate = employees?.filter(emp => 
    selectedDate ? shouldEmployeeBeConsidered(emp, selectedDate) : true
  ) || [];

  // Ottieni i dipendenti presenti
  const presentEmployees = selectedDateAttendances
    .filter(att => att.check_in_time)
    .map(att => {
      const employee = relevantEmployeesForDate.find(emp => emp.id === att.user_id);
      return employee ? {
        ...employee,
        check_in_time: att.check_in_time,
        check_out_time: att.check_out_time,
        is_business_trip: att.is_business_trip
      } : null;
    })
    .filter(emp => emp !== null);

  // Ottieni i dipendenti assenti (solo quelli che dovrebbero essere considerati per questa data)
  const absentEmployees = relevantEmployeesForDate.filter(emp => {
    const hasAttendance = selectedDateAttendances.some(att => att.user_id === emp.id && att.check_in_time);
    return !hasAttendance;
  });

  // Ottieni i dipendenti non ancora assunti per questa data
  const notYetHiredEmployees = employees?.filter(emp => 
    selectedDate && emp.hire_date && emp.tracking_start_type === 'from_hire_date' && 
    new Date(selectedDate) < new Date(emp.hire_date)
  ) || [];

  // Ottieni le date con presenze per evidenziarle nel calendario
  const datesWithAttendance = attendances?.filter(att => att.check_in_time).map(att => new Date(att.date)) || [];

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    return new Date(timeString).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Calendario */}
      <Card className="xl:col-span-1">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="w-5 h-5" />
            Calendario Presenze Generale
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
                hasAttendance: datesWithAttendance
              }}
              modifiersStyles={{
                hasAttendance: {
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  fontWeight: 'bold'
                }
              }}
              className="rounded-md border w-fit"
            />
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-green-200 rounded"></div>
              <span>Giorni con presenze</span>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                          <span className="font-medium text-sm">
                            {employee.first_name} {employee.last_name}
                          </span>
                          {employee.tracking_start_type === 'from_year_start' && (
                            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 text-xs">
                              Esistente
                            </Badge>
                          )}
                          {employee.is_business_trip && (
                            <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 text-xs">
                              Trasferta
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 text-right">
                          <div>{formatTime(employee.check_in_time)}</div>
                          <div>{formatTime(employee.check_out_time)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Nessun dipendente presente</p>
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
                        {employee.tracking_start_type === 'from_year_start' && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                            Da caricare manualmente
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Tutti i dipendenti rilevanti sono presenti</p>
                )}
              </div>

              {/* Dipendenti non ancora assunti */}
              {notYetHiredEmployees.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-600 mb-2 text-sm">
                    Non ancora assunti alla data ({notYetHiredEmployees.length})
                  </h4>
                  <div className="space-y-1">
                    {notYetHiredEmployees.map((employee) => (
                      <div key={employee.id} className="p-2 bg-gray-50 rounded border border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {employee.first_name} {employee.last_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            Assunto: {employee.hire_date ? format(new Date(employee.hire_date), 'dd/MM/yyyy') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
