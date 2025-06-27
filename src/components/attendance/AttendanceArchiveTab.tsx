
import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import ArchiveEmployeeView from './ArchiveEmployeeView';
import { Users, Calendar, Activity } from 'lucide-react';

interface AttendanceArchiveTabProps {
  type: 'presenze' | 'malattie';
}

export default function AttendanceArchiveTab({ type }: AttendanceArchiveTabProps) {
  const { attendances, isLoading } = useUnifiedAttendances();
  const { employees } = useActiveEmployees();
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const currentYear = new Date().getFullYear().toString();
    return currentYear;
  });

  // Filtra le presenze in base al tipo
  const filteredAttendances = useMemo(() => {
    if (!attendances) return [];
    
    if (type === 'malattie') {
      return attendances.filter(att => att.is_sick_leave);
    } else {
      return attendances.filter(att => !att.is_sick_leave);
    }
  }, [attendances, type]);

  // Raggruppa per dipendente
  const employeeGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    filteredAttendances.forEach(attendance => {
      const userId = attendance.user_id;
      if (!groups[userId]) {
        groups[userId] = [];
      }
      groups[userId].push(attendance);
    });
    
    return groups;
  }, [filteredAttendances]);

  // Raggruppa per anno
  const employeeYearGroups = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = {};
    
    Object.keys(employeeGroups).forEach(userId => {
      groups[userId] = {};
      employeeGroups[userId].forEach(attendance => {
        const year = new Date(attendance.date).getFullYear().toString();
        if (!groups[userId][year]) {
          groups[userId][year] = [];
        }
        groups[userId][year].push(attendance);
      });
    });
    
    return groups;
  }, [employeeGroups]);

  // Calcola statistiche
  const stats = useMemo(() => {
    const totalOperations = filteredAttendances.length;
    const employeeCount = Object.keys(employeeGroups).length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonth = filteredAttendances.filter(att => {
      const date = new Date(att.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    return { totalOperations, employeeCount, thisMonth };
  }, [filteredAttendances, employeeGroups]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Caricamento archivio...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const title = type === 'malattie' ? 'Archivio Malattie' : 'Archivio Presenze';
  const icon = type === 'malattie' ? <Activity className="w-5 h-5" /> : <Users className="w-5 h-5" />;

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Totale</p>
                <p className="text-2xl font-bold">{stats.totalOperations}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dipendenti</p>
                <p className="text-2xl font-bold">{stats.employeeCount}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Questo Mese</p>
                <p className="text-2xl font-bold">{stats.thisMonth}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista Dipendenti */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(employeeGroups).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nessuna operazione trovata per {type}</p>
            </div>
          ) : (
            <Tabs value={selectedEmployee || Object.keys(employeeGroups)[0]} onValueChange={setSelectedEmployee}>
              <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 h-auto p-1">
                {Object.keys(employeeGroups).map(userId => {
                  const employee = employees?.find(emp => emp.id === userId);
                  const yearData = employeeYearGroups[userId] || {};
                  const currentYearCount = yearData[selectedYear]?.length || 0;
                  
                  return (
                    <TabsTrigger 
                      key={userId} 
                      value={userId}
                      className="flex items-center justify-between p-3 h-auto"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">
                          {employee ? `${employee.first_name} ${employee.last_name}` : 'Dipendente'}
                        </span>
                        <Badge variant="secondary" className="mt-1">
                          {currentYearCount}
                        </Badge>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {Object.keys(employeeGroups).map(userId => (
                <TabsContent key={userId} value={userId} className="mt-6">
                  <ArchiveEmployeeView 
                    employeeId={userId}
                    attendances={employeeGroups[userId]}
                    type={type}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
