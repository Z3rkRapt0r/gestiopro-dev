
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
    <div className="container mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
          Gestione Permessi e Ferie
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 sm:h-11 bg-muted/50">
          <TabsTrigger 
            value="request" 
            className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base px-2 sm:px-4 h-10 sm:h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <CalendarDays className="h-4 w-4 flex-shrink-0" />
            <span className="hidden xs:inline sm:hidden">Nuova</span>
            <span className="hidden sm:inline">Nuova Richiesta</span>
            <span className="xs:hidden">+</span>
          </TabsTrigger>
          <TabsTrigger 
            value="archive" 
            className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base px-2 sm:px-4 h-10 sm:h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span>Storico</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="request" className="mt-4 sm:mt-6 focus-visible:outline-none focus-visible:ring-0">
          <EmployeeLeaveRequestSection />
        </TabsContent>

        <TabsContent value="archive" className="mt-4 sm:mt-6 focus-visible:outline-none focus-visible:ring-0">
          <EmployeeLeaveArchiveSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
