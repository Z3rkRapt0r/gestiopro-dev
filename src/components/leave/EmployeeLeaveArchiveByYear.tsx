
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { User2, Calendar, Clock, Trash2, CalendarDays } from "lucide-react";
import { LeaveRequest, useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

interface EmployeeLeaveArchiveByYearProps {
  employee: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  leaveRequests: LeaveRequest[];
  type: "permesso" | "ferie";
}

export default function EmployeeLeaveArchiveByYear({ employee, leaveRequests, type }: EmployeeLeaveArchiveByYearProps) {
  const { profile } = useAuth();
  const { deleteRequestMutation } = useLeaveRequests();
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const isAdmin = profile?.role === "admin";

  const employeeName = employee.first_name && employee.last_name 
    ? `${employee.first_name} ${employee.last_name}` 
    : employee.email || "Dipendente sconosciuto";

  const handleDelete = (request: LeaveRequest) => {
    const confirmMessage = `Sei sicuro di voler eliminare questa richiesta approvata? Verranno rimosse anche le presenze associate.`;
      
    if (confirm(confirmMessage)) {
      deleteRequestMutation.mutate({ id: request.id, leaveRequest: request });
    }
  };

  const handleBulkDelete = async (requests: LeaveRequest[], period: string) => {
    setBulkDeleteLoading(true);
    
    try {
      // Elimina tutte le richieste una per una
      for (const request of requests) {
        await new Promise<void>((resolve, reject) => {
          deleteRequestMutation.mutate(
            { id: request.id, leaveRequest: request },
            {
              onSuccess: () => resolve(),
              onError: (error) => reject(error)
            }
          );
        });
      }
    } catch (error) {
      console.error('Errore durante l\'eliminazione massiva:', error);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const getDateDisplay = (req: LeaveRequest) => {
    if (req.type === "permesso" && req.day) {
      const timeRange = [req.time_from, req.time_to].filter(Boolean).join(" - ");
      return (
        <div className="text-sm">
          <div>{req.day}</div>
          {timeRange && <div className="text-xs text-muted-foreground">({timeRange})</div>}
        </div>
      );
    }
    if (req.type === "ferie" && req.date_from && req.date_to) {
      return (
        <div className="text-sm">
          {req.date_from} - {req.date_to}
        </div>
      );
    }
    return <span className="text-sm text-muted-foreground">-</span>;
  };

  // Funzione per determinare l'anno di una richiesta
  const getRequestYear = (req: LeaveRequest): number => {
    if (req.type === "permesso" && req.day) {
      return new Date(req.day).getFullYear();
    }
    if (req.type === "ferie" && req.date_from) {
      return new Date(req.date_from).getFullYear();
    }
    return new Date(req.created_at).getFullYear();
  };

  // Funzione per determinare il mese di una richiesta
  const getRequestMonth = (req: LeaveRequest): number => {
    if (req.type === "permesso" && req.day) {
      return new Date(req.day).getMonth() + 1;
    }
    if (req.type === "ferie" && req.date_from) {
      return new Date(req.date_from).getMonth() + 1;
    }
    return new Date(req.created_at).getMonth() + 1;
  };

  // Funzione per convertire numero mese in nome italiano
  const getMonthName = (monthNumber: number): string => {
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return months[monthNumber - 1] || 'Mese sconosciuto';
  };

  // Raggruppa le richieste per anno
  const requestsByYear = leaveRequests.reduce((acc, req) => {
    const year = getRequestYear(req);
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(req);
    return acc;
  }, {} as Record<number, LeaveRequest[]>);

  // Raggruppa le richieste per mese (solo per permessi)
  const groupRequestsByMonth = (requests: LeaveRequest[]) => {
    return requests.reduce((acc, req) => {
      const month = getRequestMonth(req);
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(req);
      return acc;
    }, {} as Record<number, LeaveRequest[]>);
  };

  // Ordina gli anni dal più recente al più vecchio
  const sortedYears = Object.keys(requestsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  const BulkDeleteButton = ({ 
    requests, 
    period, 
    variant = "outline" 
  }: { 
    requests: LeaveRequest[]; 
    period: string; 
    variant?: "outline" | "destructive" 
  }) => {
    if (!isAdmin || requests.length === 0) return null;

    const requestTypeText = type === "permesso" ? "permessi" : "ferie";
    const confirmText = `Sei sicuro di voler eliminare tutti i ${requests.length} ${requestTypeText} di ${period} per ${employeeName}? Questa azione è irreversibile e verranno rimosse anche le presenze associate.`;

    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant={variant}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-2 ml-2"
            title={`Elimina tutti i ${requestTypeText} di ${period}`}
            disabled={bulkDeleteLoading}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione massiva</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmText}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleBulkDelete(requests, period)}
              className="bg-red-600 hover:bg-red-700"
            >
              Elimina tutto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return (
    <Card className="mb-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={`employee-${employee.id}`} className="border-none">
          <AccordionTrigger className="hover:no-underline px-6 py-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center">
                <User2 className="w-4 h-4 text-blue-600" />
              </div>
              {employeeName}
              <Badge variant="secondary" className="ml-2">
                {leaveRequests.length} {type === "permesso" ? "permessi" : "ferie"}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              {sortedYears.map((year) => {
                const yearRequests = requestsByYear[year];
                
                return (
                  <div key={year} className="border rounded-lg">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value={`year-${year}`} className="border-none">
                        <AccordionTrigger className="hover:no-underline px-4 py-3">
                          <div className="flex items-center gap-2 text-base font-medium">
                            <div className="bg-green-100 rounded-full w-6 h-6 flex items-center justify-center">
                              <CalendarDays className="w-3 h-3 text-green-600" />
                            </div>
                            Anno {year}
                            <Badge variant="outline" className="ml-2">
                              {yearRequests.length} {type === "permesso" ? "permessi" : "ferie"}
                            </Badge>
                            <BulkDeleteButton 
                              requests={yearRequests} 
                              period={`${year}`}
                            />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          {type === "permesso" ? (
                            // Per i permessi, raggruppa per mese
                            <div className="space-y-3">
                              {(() => {
                                const requestsByMonth = groupRequestsByMonth(yearRequests);
                                const sortedMonths = Object.keys(requestsByMonth)
                                  .map(Number)
                                  .sort((a, b) => b - a);

                                return sortedMonths.map((month) => {
                                  const monthRequests = requestsByMonth[month];
                                  const monthName = getMonthName(month);
                                  
                                  return (
                                    <div key={month} className="border rounded-md bg-gray-50">
                                      <div className="flex items-center justify-between p-3 bg-gray-100 rounded-t-md">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                          <Calendar className="w-4 h-4 text-purple-600" />
                                          {monthName}
                                          <Badge variant="outline" className="ml-2">
                                            {monthRequests.length} permessi
                                          </Badge>
                                          <BulkDeleteButton 
                                            requests={monthRequests} 
                                            period={`${monthName} ${year}`}
                                            variant="destructive"
                                          />
                                        </div>
                                      </div>
                                      <div className="p-3 space-y-2">
                                        {monthRequests.map((req) => (
                                          <div 
                                            key={req.id} 
                                            className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                  <Clock className="w-4 h-4 text-violet-600" />
                                                  {getDateDisplay(req)}
                                                </div>
                                              </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                              {req.note && (
                                                <div className="text-xs text-muted-foreground max-w-48 truncate" title={req.note}>
                                                  "{req.note}"
                                                </div>
                                              )}
                                              <Badge 
                                                variant="outline" 
                                                className="bg-green-50 text-green-700 border-green-200"
                                              >
                                                Approvato
                                              </Badge>
                                              <div className="text-xs text-muted-foreground">
                                                {new Date(req.created_at).toLocaleDateString('it-IT')}
                                              </div>
                                              
                                              {isAdmin && (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => handleDelete(req)}
                                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2 ml-2"
                                                  title="Elimina richiesta approvata"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          ) : (
                            // Per le ferie, mostra direttamente le richieste
                            <div className="space-y-2">
                              {yearRequests.map((req) => (
                                <div 
                                  key={req.id} 
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-blue-600" />
                                        {getDateDisplay(req)}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {req.note && (
                                      <div className="text-xs text-muted-foreground max-w-48 truncate" title={req.note}>
                                        "{req.note}"
                                      </div>
                                    )}
                                    <Badge 
                                      variant="outline" 
                                      className="bg-green-50 text-green-700 border-green-200"
                                    >
                                      Approvato
                                    </Badge>
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(req.created_at).toLocaleDateString('it-IT')}
                                    </div>
                                    
                                    {isAdmin && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDelete(req)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2 ml-2"
                                        title="Elimina richiesta approvata"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                );
              })}
              
              {sortedYears.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nessuna richiesta di {type} trovata per questo dipendente</p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
