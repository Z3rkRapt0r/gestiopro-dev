
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useBusinessTrips } from '@/hooks/useBusinessTrips';
import { useWorkingDaysTracking } from '@/hooks/useWorkingDaysTracking';
import { useLeaveBalanceSync } from '@/hooks/useLeaveBalanceSync';
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
  
  const { attendances, isLoading, deleteAttendance, isDeleting } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const { workSchedule } = useWorkSchedules();
  const { leaveRequests, deleteRequestMutation } = useLeaveRequests();
  const { businessTrips } = useBusinessTrips();
  const { shouldTrackEmployeeOnDate } = useWorkingDaysTracking();
  const { invalidateBalanceQueries } = useLeaveBalanceSync();

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  // Funzione per ottenere gli assenti
  const getAbsentEmployees = async () => {
    if (!selectedDate || !employees) return [];
    
    const absentEmployees = [];
    
    for (const emp of employees) {
      const hasAttendance = selectedDateAttendances.some(att => att.user_id === emp.id);
      if (hasAttendance) continue;
      
      const isOnLeave = selectedDateLeaves.some(leave => leave.user_id === emp.id);
      if (isOnLeave) continue;
      
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

  // Dipendenti in trasferta (deduplichiamo per evitare chiavi duplicate)
  const onBusinessTripEmployees = [];
  const processedEmployeeIds = new Set();
  
  if (businessTrips && selectedDate) {
    businessTrips.forEach(trip => {
      const tripStart = new Date(trip.start_date);
      const tripEnd = new Date(trip.end_date);
      const currentDate = new Date(selectedDate);
      
      if (currentDate >= tripStart && currentDate <= tripEnd) {
        const employee = employees?.find(emp => emp.id === trip.user_id);
        if (employee && !processedEmployeeIds.has(employee.id)) {
          // Trova tutte le trasferte attive per questo dipendente nella data selezionata
          const activeTrips = businessTrips.filter(t => {
            const tStart = new Date(t.start_date);
            const tEnd = new Date(t.end_date);
            return t.user_id === employee.id && currentDate >= tStart && currentDate <= tEnd;
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
        }
      }
    });
  }

  // Dipendenti presenti fisicamente (escludendo quelli in trasferta)
  const presentEmployees = selectedDateAttendances
    .filter(att => {
      if (!att.check_in_time || att.is_sick_leave) return false;
      if (att.notes === 'Ferie' || att.notes === 'Permesso') return false;
      // Escludi quelli in trasferta dalla sezione presenti
      const isOnBusinessTrip = onBusinessTripEmployees.some(emp => emp.id === att.user_id);
      return !isOnBusinessTrip;
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

  // Dipendenti in permesso
  const onPermissionEmployees = [];
  selectedDateLeaves.forEach(leave => {
    if (leave.type === 'permesso' && leave.day) {
      const employee = employees?.find(emp => emp.id === leave.user_id);
      if (employee) {
        const automaticAttendance = selectedDateAttendances.find(att => 
          att.user_id === leave.user_id && (att.notes === 'Permesso' || att.notes?.includes('Permesso'))
        );
        
        const isHourlyPermission = leave.time_from && leave.time_to;
        
        onPermissionEmployees.push({
          ...employee,
          attendance: automaticAttendance || null,
          leave: leave,
          permissionType: isHourlyPermission ? 'orario' : 'giornaliero',
          permissionTimeFrom: leave.time_from,
          permissionTimeTo: leave.time_to,
        });
      }
    }
  });

  if (onPermissionEmployees.length === 0) {
    const permissionAttendances = selectedDateAttendances.filter(att => 
      att.notes === 'Permesso' || att.notes?.includes('Permesso')
    );
    permissionAttendances.forEach(att => {
      const employee = employees?.find(emp => emp.id === att.user_id);
      if (employee && !onLeaveEmployees.some(emp => emp.id === employee.id)) {
        const isHourlyPermission = (att.check_in_time && att.check_out_time) || 
                                  (att.notes && att.notes.includes('(') && att.notes.includes('-') && att.notes.includes(')'));
        
        onPermissionEmployees.push({
          ...employee,
          attendance: att,
          leave: null,
          permissionType: isHourlyPermission ? 'orario' : 'giornaliero',
        });
      }
    });
  }

  const handleDeleteAttendance = (attendance: any) => {
    if (confirm('Sei sicuro di voler eliminare questa presenza?')) {
      console.log('Eliminando presenza, i bilanci saranno sincronizzati automaticamente');
      deleteAttendance(attendance);
      invalidateBalanceQueries();
    }
  };

  const handleDeletePermissionRequest = async (leaveRequest: any) => {
    if (confirm('Sei sicuro di voler eliminare questa richiesta di permesso?')) {
      console.log('Eliminando richiesta di permesso:', leaveRequest);
      console.log('I bilanci saranno aggiornati automaticamente dai trigger del database');
      
      try {
        await deleteRequestMutation.mutateAsync({
          id: leaveRequest.id,
          leaveRequest: leaveRequest
        });
        console.log('Richiesta di permesso eliminata con successo');
      } catch (error) {
        console.error('Errore nell\'eliminazione della richiesta di permesso:', error);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <AttendanceCalendarSidebar
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        workSchedule={workSchedule}
      />

      <Card className="xl:col-span-2">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            Presenze del {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: it }) : ''}
            {selectedDate && !isWorkingDay(selectedDate, workSchedule) && (
              <Badge variant="outline" className="bg-gray-50 text-gray-600 text-sm">
                Non lavorativo
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {selectedDate && !isWorkingDay(selectedDate, workSchedule) ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg mb-2">Giorno non lavorativo</div>
              <div className="text-gray-400 text-sm">
                Questo giorno non è configurato come giorno lavorativo
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-6 gap-4">
              <PresentEmployeesSection
                employees={presentEmployees}
                onDeleteAttendance={handleDeleteAttendance}
                isDeleting={isDeleting}
                formatTime={formatTime}
              />

              <SickEmployeesSection
                employees={sickEmployees}
                onDeleteAttendance={handleDeleteAttendance}
                isDeleting={isDeleting}
              />

              <LeaveEmployeesSection
                employees={onLeaveEmployees}
                onDeleteAttendance={handleDeleteAttendance}
                isDeleting={isDeleting}
              />

              <PermissionEmployeesSection
                employees={onPermissionEmployees}
                onDeleteAttendance={handleDeleteAttendance}
                onDeletePermissionRequest={handleDeletePermissionRequest}
                isDeleting={isDeleting}
                deleteRequestMutation={deleteRequestMutation}
                formatTime={formatTime}
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
  );
}
