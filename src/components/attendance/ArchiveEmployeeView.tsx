
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
import { Trash2, Calendar, Clock, FileText, AlertCircle } from 'lucide-react';

interface ArchiveEmployeeViewProps {
  employeeId: string;
  attendances: UnifiedAttendance[];
  type: 'presenze' | 'malattie';
}

export default function ArchiveEmployeeView({ employeeId, attendances, type }: ArchiveEmployeeViewProps) {
  const { employees } = useActiveEmployees();
  const { deleteAttendance, isDeleting } = useUnifiedAttendances();
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const currentYear = new Date().getFullYear().toString();
    return currentYear;
  });

  const employee = employees?.find(emp => emp.id === employeeId);

  // Raggruppa per anno
  const yearGroups = useMemo(() => {
    const groups: Record<string, UnifiedAttendance[]> = {};
    
    attendances.forEach(attendance => {
      const year = new Date(attendance.date).getFullYear().toString();
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(attendance);
    });
    
    // Ordina gli anni in ordine decrescente
    const sortedYears = Object.keys(groups).sort((a, b) => parseInt(b) - parseInt(a));
    const sortedGroups: Record<string, UnifiedAttendance[]> = {};
    sortedYears.forEach(year => {
      sortedGroups[year] = groups[year].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    
    return sortedGroups;
  }, [attendances]);

  // Raggruppa per mese nell'anno selezionato
  const monthGroups = useMemo(() => {
    const yearAttendances = yearGroups[selectedYear] || [];
    const groups: Record<string, UnifiedAttendance[]> = {};
    
    yearAttendances.forEach(attendance => {
      const month = format(new Date(attendance.date), 'yyyy-MM');
      if (!groups[month]) {
        groups[month] = [];
      }
      groups[month].push(attendance);
    });
    
    return groups;
  }, [yearGroups, selectedYear]);

  const handleDelete = (attendance: UnifiedAttendance) => {
    deleteAttendance(attendance);
  };

  const getStatusBadge = (attendance: UnifiedAttendance) => {
    if (attendance.is_sick_leave) {
      return <Badge variant="destructive">Malattia</Badge>;
    }
    if (attendance.is_manual) {
      return <Badge variant="secondary">Manuale</Badge>;
    }
    if (attendance.is_business_trip) {
      return <Badge variant="outline">Trasferta</Badge>;
    }
    return <Badge variant="default">Normale</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {employee ? `${employee.first_name} ${employee.last_name}` : 'Dipendente'}
        </h3>
        <Badge variant="outline">
          {attendances.length} record{attendances.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Selezione Anno */}
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
              {Object.keys(monthGroups).length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-muted-foreground">Nessun record per l'anno {year}</p>
                  </CardContent>
                </Card>
              ) : (
                Object.keys(monthGroups).sort().reverse().map(month => (
                  <Card key={month}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(month + '-01'), 'MMMM yyyy', { locale: it })}
                        <Badge variant="outline">
                          {monthGroups[month].length} record{monthGroups[month].length !== 1 ? 's' : ''}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {monthGroups[month].map(attendance => (
                          <div key={attendance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-medium">
                                  {format(new Date(attendance.date), 'dd/MM/yyyy', { locale: it })}
                                </span>
                                {getStatusBadge(attendance)}
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {attendance.check_in_time && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Entrata: {attendance.check_in_time}
                                  </div>
                                )}
                                {attendance.check_out_time && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Uscita: {attendance.check_out_time}
                                  </div>
                                )}
                              </div>
                              
                              {attendance.notes && (
                                <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                                  <FileText className="w-3 h-3" />
                                  {attendance.notes}
                                </div>
                              )}
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
                                  <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Sei sicuro di voler eliminare questa {type === 'malattie' ? 'malattia' : 'presenza'} del {format(new Date(attendance.date), 'dd/MM/yyyy', { locale: it })}?
                                    <br />
                                    <strong>Questa azione non può essere annullata.</strong>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(attendance)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Elimina
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
