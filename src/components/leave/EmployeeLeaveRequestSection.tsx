
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LeaveRequestForm from "./LeaveRequestForm";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export function EmployeeLeaveRequestSection() {
  const [activeTab, setActiveTab] = useState<"ferie" | "permesso">("ferie");
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
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "ferie" | "permesso")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ferie" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Richiedi Ferie
          </TabsTrigger>
          <TabsTrigger value="permesso" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Richiedi Permesso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ferie">
          <LeaveRequestForm type="ferie" onSuccess={handleSuccess} />
        </TabsContent>

        <TabsContent value="permesso">
          <LeaveRequestForm type="permesso" onSuccess={handleSuccess} />
        </TabsContent>
      </Tabs>

      {/* Sezione richieste in attesa */}
      {pendingRequests.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Richieste in Attesa di Approvazione ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                      {request.type === "permesso" ? "Permesso" : "Ferie"}
                    </Badge>
                    <div className="text-sm">
                      <div className="font-medium">{getRequestDisplayText(request)}</div>
                      {request.note && (
                        <div className="text-gray-600 mt-1">Note: {request.note}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      In Attesa
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm', { locale: it })}
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
