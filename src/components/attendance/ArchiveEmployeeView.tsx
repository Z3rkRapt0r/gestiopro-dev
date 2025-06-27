
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUnifiedAttendances, UnifiedAttendance } from '@/hooks/useUnifiedAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Trash2, Calendar, FileText, AlertCircle } from 'lucide-react';

interface ArchiveEmployeeViewProps {
  employeeId: string;
  attendances: UnifiedAttendance[];
  type: 'presenze' | 'malattie';
}

interface AttendancePeriod {
  startDate: string;
  endDate: string;
  type: string;
  notes?: string;
  attendances: UnifiedAttendance[];
}

export default function ArchiveEmployeeView({ employeeId, attendances, type }: ArchiveEmployeeViewProps) {
  const { employees } = useActiveEmployees();
  const { deleteAttendance, isDeleting } = useUnifiedAttendances();
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const currentYear = new Date().getFullYear().toString();
    return currentYear;
  });

  const employee = employees?.find(emp => emp.id === employeeId);

  // Group consecutive attendances into periods
  const groupIntoPeriods = (attendanceList: UnifiedAttendance[]): AttendancePeriod[] => {
    if (attendanceList.length === 0) return [];

    // Sort by date
    const sortedAttendances = [...attendanceList].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const periods: AttendancePeriod[] = [];
    let currentPeriod: UnifiedAttendance[] = [sortedAttendances[0]];

    for (let i = 1; i < sortedAttendances.length; i++) {
      const current = sortedAttendances[i];
      const previous = sortedAttendances[i - 1];
      
      const currentDate = new Date(current.date);
      const previousDate = new Date(previous.date);
      const dayDifference = Math.abs(currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Check if consecutive and same type
      const isConsecutive = dayDifference <= 1;
      const isSameType = current.is_sick_leave === previous.is_sick_leave && 
                        current.is_business_trip === previous.is_business_trip &&
                        current.is_manual === previous.is_manual;

      if (isConsecutive && isSameType) {
        currentPeriod.push(current);
      } else {
        // Create period from current group
        periods.push({
          startDate: currentPeriod[0].date,
          endDate: currentPeriod[currentPeriod.length - 1].date,
          type: currentPeriod[0].is_sick_leave ? 'malattia' : 'presenza',
          notes: currentPeriod[0].notes,
          attendances: currentPeriod
        });
        currentPeriod = [current];
      }
    }

    // Add the last period
    periods.push({
      startDate: currentPeriod[0].date,
      endDate: currentPeriod[currentPeriod.length - 1].date,
      type: currentPeriod[0].is_sick_leave ? 'malattia' : 'presenza',
      notes: currentPeriod[0].notes,
      attendances: currentPeriod
    });

    return periods.reverse(); // Most recent first
  };

  // Group by year and then into periods
  const yearGroups = useMemo(() => {
    const groups: Record<string, AttendancePeriod[]> = {};
    
    attendances.forEach(attendance => {
      const year = new Date(attendance.date).getFullYear().toString();
      if (!groups[year]) {
        groups[year] = [];
      }
    });

    // Group attendances by year first
    const yearAttendances: Record<string, UnifiedAttendance[]> = {};
    attendances.forEach(attendance => {
      const year = new Date(attendance.date).getFullYear().toString();
      if (!yearAttendances[year]) {
        yearAttendances[year] = [];
      }
      yearAttendances[year].push(attendance);
    });

    // Convert to periods for each year
    Object.keys(yearAttendances).forEach(year => {
      groups[year] = groupIntoPeriods(yearAttendances[year]);
    });
    
    // Sort years in descending order
    const sortedYears = Object.keys(groups).sort((a, b) => parseInt(b) - parseInt(a));
    const sortedGroups: Record<string, AttendancePeriod[]> = {};
    sortedYears.forEach(year => {
      sortedGroups[year] = groups[year];
    });
    
    return sortedGroups;
  }, [attendances]);

  const handleDeletePeriod = async (period: AttendancePeriod) => {
    // Delete all attendances in the period
    for (const attendance of period.attendances) {
      await deleteAttendance(attendance);
    }
  };

  const getStatusBadge = (period: AttendancePeriod) => {
    const firstAttendance = period.attendances[0];
    if (firstAttendance.is_sick_leave) {
      return <Badge variant="destructive">Malattia</Badge>;
    }
    if (firstAttendance.is_manual) {
      return <Badge variant="secondary">Manuale</Badge>;
    }
    if (firstAttendance.is_business_trip) {
      return <Badge variant="outline">Trasferta</Badge>;
    }
    return <Badge variant="default">Normale</Badge>;
  };

  const formatPeriod = (period: AttendancePeriod) => {
    const startDate = format(new Date(period.startDate), 'dd/MM/yyyy', { locale: it });
    const endDate = format(new Date(period.endDate), 'dd/MM/yyyy', { locale: it });
    
    if (period.type === 'malattia') {
      if (period.startDate === period.endDate) {
        return `${startDate} - Malattia`;
      } else {
        return `Malattia dal ${startDate} al ${endDate}`;
      }
    }
    
    // For regular attendance periods
    if (period.startDate === period.endDate) {
      const attendance = period.attendances[0];
      if (attendance.check_in_time && attendance.check_out_time) {
        return `${startDate} - ${attendance.check_in_time}/${attendance.check_out_time}`;
      } else if (attendance.check_in_time) {
        return `${startDate} - ${attendance.check_in_time}/--:--`;
      } else {
        return startDate;
      }
    } else {
      return `Presenza dal ${startDate} al ${endDate}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {employee ? `${employee.first_name} ${employee.last_name}` : 'Dipendente'}
        </h3>
        <Badge variant="outline">
          {yearGroups[selectedYear]?.length || 0} periodi
        </Badge>
      </div>

      {/* Year Selection */}
      <Tabs value={selectedYear} onValueChange={setSelectedYear}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
          {Object.keys(yearGroups).map(year => (
            <TabsTrigger key={year} value={year} className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {year}
              <Badge variant="secondary" className="ml-1">
                {yearGroups[year].length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.keys(yearGroups).map(year => (
          <TabsContent key={year} value={year} className="mt-6">
            <div className="grid gap-4">
              {yearGroups[year].length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-muted-foreground">Nessun periodo per l'anno {year}</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Anno {year}
                      <Badge variant="outline">
                        {yearGroups[year].length} periodi
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {yearGroups[year].map((period, index) => (
                        <div key={`period-${year}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-medium">
                                {formatPeriod(period)}
                              </span>
                              {getStatusBadge(period)}
                            </div>
                            
                            {period.notes && (
                              <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                                <FileText className="w-3 h-3" />
                                {period.notes}
                              </div>
                            )}
                            
                            <div className="text-xs text-gray-500 mt-1">
                              {period.attendances.length} {period.attendances.length === 1 ? 'giorno' : 'giorni'}
                            </div>
                          </div>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                disabled={isDeleting}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Conferma Eliminazione Periodo</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Sei sicuro di voler eliminare questo periodo di {type === 'malattie' ? 'malattia' : 'presenza'}?
                                  <br />
                                  <strong>Periodo: {formatPeriod(period)}</strong>
                                  <br />
                                  <strong>Verranno eliminati {period.attendances.length} {period.attendances.length === 1 ? 'giorno' : 'giorni'}.</strong>
                                  <br />
                                  <strong>Questa azione non può essere annullata.</strong>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeletePeriod(period)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Elimina Periodo
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
