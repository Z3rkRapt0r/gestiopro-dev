
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { EmployeeLeaveRequestSection } from "./EmployeeLeaveRequestSection";
import { EmployeeLeaveArchiveSection } from "./EmployeeLeaveArchiveSection";
import { CalendarDays, FileText } from "lucide-react";

export default function EmployeeLeavePage() {
  const [activeTab, setActiveTab] = useState("request");
  const queryClient = useQueryClient();

  // Aggiorna i dati quando si cambia tab
  useEffect(() => {
    console.log('Cambio tab permessi dipendente, invalidando tutte le query dei bilanci...');
    queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
    queryClient.invalidateQueries({ queryKey: ['employee-leave-balance'] });
    queryClient.invalidateQueries({ queryKey: ['employee-leave-balance-stats'] });
    queryClient.invalidateQueries({ queryKey: ['leave_balance_validation'] });
  }, [activeTab, queryClient]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestione Permessi e Ferie</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="request" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Nuova Richiesta
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Storico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="request">
          <EmployeeLeaveRequestSection />
        </TabsContent>

        <TabsContent value="archive">
          <EmployeeLeaveArchiveSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
