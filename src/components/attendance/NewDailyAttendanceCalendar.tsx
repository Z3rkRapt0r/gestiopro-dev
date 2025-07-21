import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useBusinessTrips } from '@/hooks/useBusinessTrips';
import { useWorkingDaysTracking } from '@/hooks/useWorkingDaysTracking';
import { useSickLeavesForCalendars } from '@/hooks/useSickLeavesForCalendars';
import { useTimeBasedPermissionValidation } from '@/hooks/useTimeBasedPermissionValidation';
import { formatTime, isWorkingDay } from '@/utils/attendanceUtils';
import AttendanceCalendarSidebar from './calendar/AttendanceCalendarSidebar';
import PresentEmployeesSection from './sections/PresentEmployeesSection';
import SickEmployeesSection from './sections/SickEmployeesSection';
import LeaveEmployeesSection from './sections/LeaveEmployeesSection';
import PermissionEmployeesSection from './sections/PermissionEmployeesSection';
import BusinessTripEmployeesSection from './sections/BusinessTripEmployeesSection';
import AbsentEmployeesSection from './sections/AbsentEmployeesSection';

export default function NewDailyAttendanceCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [absentEmployees, setAbsentEmployees] = useState<any[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { attendances, isLoading } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const { workSchedule } = useWorkSchedules();
  const { leaveRequests } = useLeaveRequests();
  const { businessTrips } = useBusinessTrips();
  const { shouldTrackEmployeeOnDate } = useWorkingDaysTracking();
  const { getSickLeavesForDate, isUserSickOnDate } = useSickLeavesForCalendars();
  const { isPermissionActive, getPermissionStatus } = useTimeBasedPermissionValidation();

  // Timer per aggiornare l'ora corrente ogni minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Aggiorna ogni minuto

    return () => clearInterval(timer);
  }, []);

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const isToday = selectedDate ? format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') : false;

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
  console.log('Ora corrente per validazione temporale:', format(currentTime, 'HH:mm:ss'));
  
  const selectedDateAttendances = attendances?.filter(att => {
    console.log(`Confronto: ${att.date} === ${selectedDateStr} ?`, att.date === selectedDateStr);
    return att.date === selectedDateStr;
  }) || [];

  console.log('Presenze per la data selezionata:', selectedDateAttendances);

  // CORREZIONE: Usa confronto stringhe E logica temporale per i permessi
  const selectedDateLeaves = leaveRequests?.filter(request => {
    if (request.status !== 'approved') return false;
    
    if (request.type === 'ferie' && request.date_from && request.date_to) {
      return selectedDateStr >= request.date_from && selectedDateStr <= request.date_to;
    }
    
    if (request.type === 'permesso' && request.day) {
      if (request.day !== selectedDateStr) return false;
      
      // Per permessi, usa la logica temporale solo se stiamo guardando oggi
      if (isToday) {
        return isPermissionActive(request, currentTime);
      } else {
        // Per date passate/future, mostra sempre tutti i permessi
        return true;
      }
    }
    
    return false;
  }) || [];

  console.log('🔍 Ferie/Permessi per la data selezionata (con logica temporale):', selectedDateLeaves.map(leave => ({
    user: leave.profiles?.first_name,
    type: leave.type,
    from: leave.date_from || leave.day,
    to: leave.date_to || leave.day,
    timeFrom: leave.time_from,
    timeTo: leave.time_to,
    isActive: leave.type === 'permesso' ? isPermissionActive(leave, currentTime) : true
  })));

  // PRIMA: Calcola i dipendenti in trasferta (riorganizzato per essere calcolato per primo)
  const onBusinessTripEmployees = [];
  const processedEmployeeIds = new Set();
  
  console.log('🔍 Calcolo dipendenti in trasferta per la data:', selectedDateStr);
  console.log('📋 Trasferte disponibili:', businessTrips?.map(trip => ({
    user_id: trip.user_id,
    destination: trip.destination,
    dates: `${trip.start_date} - ${trip.end_date}`
  })));

  if (businessTrips && selectedDate) {
    businessTrips.forEach(trip => {
      // Usa le stringhe delle date per la comparazione più affidabile
      const tripStartStr = trip.start_date;
      const tripEndStr = trip.end_date;
      const currentDateStr = selectedDateStr;
      
      console.log('📅 Verifica trasferta:', {
        destination: trip.destination,
        tripStart: tripStartStr,
        tripEnd: tripEndStr,
        currentDate: currentDateStr,
        isInRange: currentDateStr >= tripStartStr && currentDateStr <= tripEndStr
      });
      
      // Confronta le stringhe delle date direttamente (formato YYYY-MM-DD)
      if (currentDateStr >= tripStartStr && currentDateStr <= tripEndStr) {
        const employee = employees?.find(emp => emp.id === trip.user_id);
        if (employee && !processedEmployeeIds.has(employee.id)) {
          // Trova tutte le trasferte attive per questo dipendente nella data selezionata
          const activeTrips = businessTrips.filter(t => {
            return t.user_id === employee.id && 
                   currentDateStr >= t.start_date && 
                   currentDateStr <= t.end_date;
          });

          // Usa la trasferta più recente o quella con destinazione più specifica
          const primaryTrip = activeTrips.reduce((latest, current) => {
            return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
          }, trip);

          onBusinessTripEmployees.push({
            ...employee,
            businessTrip: {
              destination: primaryTrip.destination,
              start_date: primaryTrip.start_date,
              end_date: primaryTrip.end_date,
              reason: primaryTrip.reason,
            },
          });
          
          processedEmployeeIds.add(employee.id);
          console.log('✅ Dipendente aggiunto alla lista trasferte:', employee.first_name, employee.last_name);
        }
      }
    });
  }

  console.log('🚌 Dipendenti in trasferta finali:', onBusinessTripEmployees.map(emp => `${emp.first_name} ${emp.last_name}`));

  // DOPO: Calcola i dipendenti presenti fisicamente (escludendo quelli in trasferta)
  const presentEmployees = selectedDateAttendances
    .filter(att => {
      console.log('🔍 Verifica presenza per filtro:', {
        user_id: att.user_id,
        check_in_time: att.check_in_time,
        is_sick_leave: att.is_sick_leave,
        is_business_trip: att.is_business_trip,
        notes: att.notes
      });

      // Escludi se non ha orario di entrata o è in malattia
      if (!att.check_in_time || att.is_sick_leave) {
        console.log('❌ Escluso: nessun check-in o malattia');
        return false;
      }
      
      // Escludi se è ferie o permesso
      if (att.notes === 'Ferie' || att.notes === 'Permesso') {
        console.log('❌ Escluso: ferie o permesso');
        return false;
      }
      
      // Escludi se ha il flag is_business_trip a true
      if (att.is_business_trip) {
        console.log('❌ Escluso: flag is_business_trip = true');
        return false;
      }
      
      // Escludi se è nella lista dei dipendenti in trasferta
      const isOnBusinessTrip = onBusinessTripEmployees.some(emp => emp.id === att.user_id);
      if (isOnBusinessTrip) {
        console.log('❌ Escluso: presente nella lista trasferte');
        return false;
      }
      
      console.log('✅ Incluso nella sezione presenti');
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

  console.log('👥 Dipendenti presenti finali:', presentEmployees.map(emp => `${emp.first_name} ${emp.last_name}`));

  // Dipendenti in malattia - NUOVA LOGICA con tabella sick_leaves
  const sickLeaveDays = getSickLeavesForDate(selectedDateStr);
  const sickEmployees = sickLeaveDays.map(sickDay => {
    const employee = employees?.find(emp => emp.id === sickDay.user_id);
    // Cerca una presenza manuale eventualmente registrata per questo giorno di malattia
    const attendance = selectedDateAttendances.find(att => 
      att.user_id === sickDay.user_id && att.is_sick_leave
    );
    
    return {
      ...employee,
      attendance: attendance || {
        notes: sickDay.notes,
        date: sickDay.date,
        user_id: sickDay.user_id,
        is_sick_leave: true
      },
      sickLeaveId: sickDay.sick_leave_id,
    };
  }).filter(emp => emp.id);

  console.log('🤒 Dipendenti in malattia dalla nuova tabella:', sickEmployees.map(emp => `${emp.first_name} ${emp.last_name}`));

  // Dipendenti in ferie
  const onLeaveEmployees = [];
  employees?.forEach(employee => {
    const activeLeave = selectedDateLeaves.find(leave => 
      leave.type === 'ferie' && leave.user_id === employee.id
    );
    
    if (activeLeave) {
      const automaticAttendance = selectedDateAttendances.find(att => 
        att.user_id === employee.id && att.notes === 'Ferie'
      );
      
      onLeaveEmployees.push({
        ...employee,
        attendance: automaticAttendance || null,
        leave: activeLeave,
      });
    } else {
      const ferieAttendance = selectedDateAttendances.find(att => 
        att.user_id === employee.id && att.notes === 'Ferie'
      );
      
      if (ferieAttendance) {
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

  // Dipendenti in permesso con stato temporale
  const onPermissionEmployees = [];
  selectedDateLeaves.forEach(leave => {
    if (leave.type === 'permesso' && leave.day) {
      const employee = employees?.find(emp => emp.id === leave.user_id);
      if (employee) {
        const automaticAttendance = selectedDateAttendances.find(att => 
          att.user_id === leave.user_id && (att.notes === 'Permesso' || att.notes?.includes('Permesso'))
        );
        
        const isHourlyPermission = leave.time_from && leave.time_to;
        const permissionStatus = getPermissionStatus(leave, currentTime);
        
        onPermissionEmployees.push({
          ...employee,
          attendance: automaticAttendance || null,
          leave: leave,
          permissionType: isHourlyPermission ? 'orario' : 'giornaliero',
          permissionTimeFrom: leave.time_from,
          permissionTimeTo: leave.time_to,
          permissionStatus: permissionStatus,
          isActive: isPermissionActive(leave, currentTime)
        });
      }
    }
  });

  // Cerca anche permessi nelle attendance che potrebbero non essere più attivi
  if (isToday) {
    const permissionAttendances = selectedDateAttendances.filter(att => 
      att.notes === 'Permesso' || att.notes?.includes('Permesso')
    );
    
    permissionAttendances.forEach(att => {
      const employee = employees?.find(emp => emp.id === att.user_id);
      if (employee && !onPermissionEmployees.some(emp => emp.id === employee.id)) {
        // Cerca la richiesta di permesso originale per ottenere gli orari
        const relatedLeave = leaveRequests?.find(leave => 
          leave.type === 'permesso' && 
          leave.user_id === employee.id && 
          leave.day === selectedDateStr &&
          leave.status === 'approved'
        );
        
        if (relatedLeave) {
          const permissionStatus = getPermissionStatus(relatedLeave, currentTime);
          
          onPermissionEmployees.push({
            ...employee,
            attendance: att,
            leave: relatedLeave,
            permissionType: (relatedLeave.time_from && relatedLeave.time_to) ? 'orario' : 'giornaliero',
            permissionTimeFrom: relatedLeave.time_from,
            permissionTimeTo: relatedLeave.time_to,
            permissionStatus: permissionStatus,
            isActive: isPermissionActive(relatedLeave, currentTime)
          });
        }
      }
    });
  }

  // Funzione per ottenere gli assenti con logica temporale migliorata
  const getAbsentEmployees = async () => {
    if (!selectedDate || !employees) return [];
    
    const absentEmployees = [];
    
    for (const emp of employees) {
      const hasAttendance = selectedDateAttendances.some(att => att.user_id === emp.id);
      if (hasAttendance) continue;
      
      const isOnLeave = selectedDateLeaves.some(leave => leave.user_id === emp.id && leave.type === 'ferie');
      if (isOnLeave) continue;
      
      // Verifica se è in malattia
      const isSick = isUserSickOnDate(emp.id, selectedDateStr);
      if (isSick) continue;
      
      // Verifica se è in trasferta
      const isOnBusinessTrip = onBusinessTripEmployees.some(empTrip => empTrip.id === emp.id);
      if (isOnBusinessTrip) continue;
      
      // Verifica se è in permesso attivo (solo per oggi)
      let isOnActivePermission = false;
      if (isToday) {
        const employeePermissions = selectedDateLeaves.filter(leave => 
          leave.user_id === emp.id && leave.type === 'permesso'
        );
        isOnActivePermission = employeePermissions.some(permission => 
          isPermissionActive(permission, currentTime)
        );
      } else {
        // Per date passate/future, considera tutti i permessi come attivi
        isOnActivePermission = onPermissionEmployees.some(empPerm => empPerm.id === emp.id);
      }
      
      if (isOnActivePermission) continue;
      
      const shouldTrack = await shouldTrackEmployeeOnDate(emp.id, selectedDateStr);
      if (shouldTrack && isWorkingDay(selectedDate, workSchedule)) {
        absentEmployees.push(emp);
      }
    }
    
    return absentEmployees;
  };

  React.useEffect(() => {
    if (selectedDateStr && employees && attendances) {
      getAbsentEmployees().then(setAbsentEmployees);
    }
  }, [selectedDateStr, employees, attendances, currentTime, selectedDateLeaves]);

  // Navigation functions for mobile
  const navigateDate = (direction: 'prev' | 'next') => {
    if (!selectedDate) return;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  return (
    <div className="space-y-4">
      {/* Mobile date navigation */}
      <div className="flex sm:hidden items-center justify-between bg-white rounded-lg border p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateDate('prev')}
          className="h-9 w-9 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex flex-col items-center">
          <div className="font-medium text-sm">
            {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: it }) : ''}
          </div>
          {selectedDate && !isWorkingDay(selectedDate, workSchedule) && (
            <Badge variant="outline" className="bg-gray-50 text-gray-600 text-xs mt-1">
              Non lavorativo
            </Badge>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateDate('next')}
          className="h-9 w-9 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Toggle sidebar button for mobile */}
      <div className="flex sm:hidden mb-4">
        <Button
          variant="outline"
          onClick={() => setShowSidebar(!showSidebar)}
          className="w-full"
        >
          {showSidebar ? 'Nascondi Calendario' : 'Mostra Calendario'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Calendar Sidebar - Collapsible on mobile */}
        <div className={`lg:block ${showSidebar ? 'block' : 'hidden'}`}>
          <AttendanceCalendarSidebar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            workSchedule={workSchedule}
          />
        </div>

        {/* Main Content */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Presenze del {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: it }) : ''}</span>
                <span className="sm:hidden">Presenze</span>
              </div>
              {selectedDate && !isWorkingDay(selectedDate, workSchedule) && (
                <Badge variant="outline" className="bg-gray-50 text-gray-600 text-xs sm:text-sm">
                  Non lavorativo
                </Badge>
              )}
              {isToday && (
                <Badge variant="outline" className="bg-blue-50 text-blue-600 text-xs sm:text-sm">
                  Aggiornato alle {format(currentTime, 'HH:mm')}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            {selectedDate && !isWorkingDay(selectedDate, workSchedule) ? (
              <div className="text-center py-8">
                <div className="text-gray-500 text-base sm:text-lg mb-2">Giorno non lavorativo</div>
                <div className="text-gray-400 text-sm">
                  Questo giorno non è configurato come giorno lavorativo
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
                <PresentEmployeesSection
                  employees={presentEmployees}
                  formatTime={formatTime}
                />

                <SickEmployeesSection
                  employees={sickEmployees}
                />

                <LeaveEmployeesSection
                  employees={onLeaveEmployees}
                />

                <PermissionEmployeesSection
                  employees={onPermissionEmployees}
                  formatTime={formatTime}
                  showTemporalStatus={isToday}
                />

                <BusinessTripEmployeesSection
                  employees={onBusinessTripEmployees}
                />

                <AbsentEmployeesSection employees={absentEmployees} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
