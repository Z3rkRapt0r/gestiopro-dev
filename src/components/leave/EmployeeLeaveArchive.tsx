
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, User, Calendar, Clock, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface EmployeeLeaveArchiveProps {
  employee: Employee;
  leaveRequests: any[];
  type: "permesso" | "ferie";
}

export default function EmployeeLeaveArchive({ employee, leaveRequests, type }: EmployeeLeaveArchiveProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const { deleteRequestMutation } = useLeaveRequests();
  const { toast } = useToast();

  const employeeName = employee.first_name && employee.last_name 
    ? `${employee.first_name} ${employee.last_name}` 
    : employee.email || "Dipendente sconosciuto";

  const handleSelectRequest = (requestId: string) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedRequests(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedRequests.size === 0) return;
    
    if (window.confirm(`Sei sicuro di voler eliminare ${selectedRequests.size} richieste?`)) {
      try {
        for (const requestId of selectedRequests) {
          await deleteRequestMutation.mutateAsync({ id: requestId });
        }
        toast({ title: `${selectedRequests.size} richieste eliminate con successo` });
        setSelectedRequests(new Set());
      } catch (error) {
        toast({ title: "Errore nell'eliminazione", variant: "destructive" });
      }
    }
  };

  const getRequestDisplay = (request: any) => {
    if (request.type === "permesso") {
      const dateStr = format(new Date(request.day), 'dd/MM/yyyy', { locale: it });
      if (request.time_from && request.time_to) {
        return `${dateStr} (${request.time_from} - ${request.time_to})`;
      }
      return `${dateStr} (Giornata intera)`;
    } else {
      const fromStr = format(new Date(request.date_from), 'dd/MM/yyyy', { locale: it });
      const toStr = format(new Date(request.date_to), 'dd/MM/yyyy', { locale: it });
      return `${fromStr} - ${toStr}`;
    }
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader 
            className="cursor-pointer hover:bg-muted/50 transition-colors pb-3 sm:pb-4"
          >
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <User className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate text-sm sm:text-base">{employeeName}</span>
                <Badge variant="outline" className="flex-shrink-0 text-xs">
                  {leaveRequests.length} {type}
                </Badge>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {selectedRequests.size > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBulkDelete();
                    }}
                    className="h-8 text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Elimina ({selectedRequests.size})
                  </Button>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-2 sm:space-y-3">
              {leaveRequests.map((request) => (
                <div 
                  key={request.id} 
                  className="p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {/* Mobile layout - stacked */}
                  <div className="space-y-3 sm:hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedRequests.has(request.id)}
                          onChange={() => handleSelectRequest(request.id)}
                          className="rounded"
                        />
                        {request.type === "permesso" ? (
                          <Clock className="w-4 h-4 text-violet-600" />
                        ) : (
                          <Calendar className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                        Approvato
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        {getRequestDisplay(request)}
                      </div>
                      
                      {request.note && (
                        <div className="text-xs text-muted-foreground p-2 bg-white rounded border-l-2 border-gray-200">
                          <span className="font-medium">Note:</span> {request.note}
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        Approvato il {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: it })}
                      </div>
                    </div>
                  </div>

                  {/* Desktop layout - horizontal */}
                  <div className="hidden sm:flex sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedRequests.has(request.id)}
                        onChange={() => handleSelectRequest(request.id)}
                        className="rounded"
                      />
                      <div className="flex items-center gap-2">
                        {request.type === "permesso" ? (
                          <Clock className="w-4 h-4 text-violet-600" />
                        ) : (
                          <Calendar className="w-4 h-4 text-blue-600" />
                        )}
                        <div className="text-sm font-medium">
                          {getRequestDisplay(request)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {request.note && (
                        <div className="text-xs text-muted-foreground max-w-48 truncate" title={request.note}>
                          <FileText className="w-3 h-3 inline mr-1" />
                          "{request.note}"
                        </div>
                      )}
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                        Approvato
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: it })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {leaveRequests.length === 0 && (
                <p className="text-muted-foreground text-center py-6 text-sm">
                  Nessun {type} approvato trovato
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
