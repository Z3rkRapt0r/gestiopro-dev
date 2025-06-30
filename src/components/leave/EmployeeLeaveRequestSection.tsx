
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LeaveRequestForm from "./LeaveRequestForm";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export function EmployeeLeaveRequestSection() {
  const { leaveRequests, isLoading } = useLeaveRequests();

  // Filtra solo le richieste pending dell'utente corrente
  const pendingRequests = leaveRequests?.filter(request => request.status === "pending") || [];

  const handleSuccess = () => {
    // Non ricaricare più la pagina, la query si aggiorna automaticamente
    console.log('Richiesta inviata con successo');
  };

  const getRequestDisplayText = (request: any) => {
    if (request.type === "permesso") {
      if (request.time_from && request.time_to) {
        return `${format(new Date(request.day), 'dd/MM/yyyy', { locale: it })} dalle ${request.time_from} alle ${request.time_to}`;
      } else {
        return `${format(new Date(request.day), 'dd/MM/yyyy', { locale: it })} - Giornata intera`;
      }
    } else {
      return `Dal ${format(new Date(request.date_from), 'dd/MM/yyyy', { locale: it })} al ${format(new Date(request.date_to), 'dd/MM/yyyy', { locale: it })}`;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <LeaveRequestForm onSuccess={handleSuccess} />

      {/* Sezione richieste in attesa */}
      {pendingRequests.length > 0 && (
        <Card className="mt-4 sm:mt-6">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
              <span className="truncate">Richieste in Attesa</span>
              <Badge variant="secondary" className="ml-auto flex-shrink-0 text-xs">
                {pendingRequests.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  {/* Header mobile con badge e tipo */}
                  <div className="flex items-start justify-between mb-3 sm:mb-2">
                    <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs flex-shrink-0">
                      {request.type === "permesso" ? "Permesso" : "Ferie"}
                    </Badge>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs ml-2 flex-shrink-0">
                      In Attesa
                    </Badge>
                  </div>

                  {/* Informazioni principali */}
                  <div className="space-y-2">
                    <div className="text-sm sm:text-base font-medium text-gray-900">
                      {getRequestDisplayText(request)}
                    </div>
                    
                    {request.note && (
                      <div className="text-xs sm:text-sm text-gray-600 bg-white/50 p-2 rounded">
                        <span className="font-medium">Note:</span> {request.note}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2 border-t border-orange-200">
                      <div className="text-xs text-gray-500">
                        Richiesta del {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: it })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(request.created_at), 'HH:mm', { locale: it })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
