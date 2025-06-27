
import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useActiveEmployees } from '@/hooks/useActiveEmployees';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Users, Calendar, Activity, Trash2, Clock, FileText } from 'lucide-react';

interface LeaveArchiveTabProps {
  type: 'permessi' | 'ferie';
}

export default function LeaveArchiveTab({ type }: LeaveArchiveTabProps) {
  const { leaveRequests, isLoading, deleteRequestMutation } = useLeaveRequests();
  const { employees } = useActiveEmployees();
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const currentYear = new Date().getFullYear().toString();
    return currentYear;
  });

  // Filter requests by type
  const filteredRequests = useMemo(() => {
    if (!leaveRequests) return [];
    return leaveRequests.filter(request => request.type === type);
  }, [leaveRequests, type]);

  // Group by employee
  const employeeGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    filteredRequests.forEach(request => {
      const userId = request.user_id;
      if (!groups[userId]) {
        groups[userId] = [];
      }
      groups[userId].push(request);
    });
    
    return groups;
  }, [filteredRequests]);

  // Group by year
  const employeeYearGroups = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = {};
    
    Object.keys(employeeGroups).forEach(userId => {
      groups[userId] = {};
      employeeGroups[userId].forEach(request => {
        const requestDate = type === 'ferie' ? request.date_from : request.day;
        if (requestDate) {
          const year = new Date(requestDate).getFullYear().toString();
          if (!groups[userId][year]) {
            groups[userId][year] = [];
          }
          groups[userId][year].push(request);
        }
      });
    });
    
    return groups;
  }, [employeeGroups, type]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalOperations = filteredRequests.length;
    const employeeCount = Object.keys(employeeGroups).length;
    const approvedCount = filteredRequests.filter(req => req.status === 'approved').length;

    return { totalOperations, employeeCount, approvedCount };
  }, [filteredRequests, employeeGroups]);

  const handleDelete = (requestId: string) => {
    deleteRequestMutation.mutate(requestId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approvata</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rifiutata</Badge>;
      case 'pending':
        return <Badge variant="secondary">In attesa</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPeriod = (request: any) => {
    if (type === 'ferie') {
      if (request.date_from && request.date_to) {
        const startDate = format(new Date(request.date_from), 'dd/MM/yyyy');
        const endDate = format(new Date(request.date_to), 'dd/MM/yyyy');
        if (startDate === endDate) {
          return `${startDate}`;
        } else {
          return `Dal ${startDate} al ${endDate}`;
        }
      }
    } else {
      if (request.day) {
        const dateStr = format(new Date(request.day), 'dd/MM/yyyy');
        if (request.time_from && request.time_to) {
          return `${dateStr} dalle ${request.time_from} alle ${request.time_to}`;
        }
        return dateStr;
      }
    }
    return 'Data non specificata';
  };

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

  const title = type === 'ferie' ? 'Archivio Ferie' : 'Archivio Permessi';
  const icon = type === 'ferie' ? <Calendar className="w-5 h-5" /> : <Clock className="w-5 h-5" />;

  return (
    <div className="space-y-6">
      {/* Statistics */}
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
                <p className="text-sm font-medium text-muted-foreground">Approvate</p>
                <p className="text-2xl font-bold">{stats.approvedCount}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
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
              <p>Nessun periodo trovato per {type}</p>
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
                          {currentYearCount} periodi
                        </Badge>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {Object.keys(employeeGroups).map(userId => {
                const employee = employees?.find(emp => emp.id === userId);
                const yearData = employeeYearGroups[userId] || {};
                const availableYears = Object.keys(yearData).sort((a, b) => parseInt(b) - parseInt(a));

                return (
                  <TabsContent key={userId} value={userId} className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          {employee ? `${employee.first_name} ${employee.last_name}` : 'Dipendente'}
                        </h3>
                      </div>

                      {/* Year Selection */}
                      <Tabs value={selectedYear} onValueChange={setSelectedYear}>
                        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
                          {availableYears.map(year => (
                            <TabsTrigger key={year} value={year} className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {year}
                              <Badge variant="secondary" className="ml-1">
                                {yearData[year]?.length || 0}
                              </Badge>
                            </TabsTrigger>
                          ))}
                        </TabsList>

                        {availableYears.map(year => {
                          const yearRequests = yearData[year] || [];
                          const sortedRequests = yearRequests.sort((a, b) => {
                            const dateA = new Date(type === 'ferie' ? (a.date_from || a.day) : a.day);
                            const dateB = new Date(type === 'ferie' ? (b.date_from || b.day) : b.day);
                            return dateB.getTime() - dateA.getTime();
                          });

                          return (
                            <TabsContent key={year} value={year} className="mt-6">
                              <div className="space-y-3">
                                {sortedRequests.length === 0 ? (
                                  <div className="text-center py-8 text-muted-foreground">
                                    <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                    <p>Nessun periodo per l'anno {year}</p>
                                  </div>
                                ) : (
                                  <Card>
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Anno {year}
                                        <Badge variant="outline">
                                          {sortedRequests.length} periodi
                                        </Badge>
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-3">
                                        {sortedRequests.map((request, index) => (
                                          <div key={`${year}-${index}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-3 mb-2">
                                                <span className="font-medium">
                                                  {formatPeriod(request)}
                                                </span>
                                                {getStatusBadge(request.status)}
                                              </div>
                                              
                                              {request.note && (
                                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                                  <FileText className="w-3 h-3" />
                                                  {request.note}
                                                </div>
                                              )}
                                            </div>
                                            
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button 
                                                  variant="destructive" 
                                                  size="sm"
                                                  disabled={deleteRequestMutation.isPending}
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Conferma Eliminazione Periodo</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Sei sicuro di voler eliminare questo periodo di {type}?
                                                    <br />
                                                    <strong>Periodo: {formatPeriod(request)}</strong>
                                                    <br />
                                                    <strong>Questa azione non può essere annullata.</strong>
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                  <AlertDialogAction 
                                                    onClick={() => handleDelete(request.id)}
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
                          );
                        })}
                      </Tabs>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
