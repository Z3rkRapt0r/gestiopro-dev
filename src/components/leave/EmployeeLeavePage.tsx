
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
    <div className="container mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">
          Gestione Permessi e Ferie
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 sm:h-10">
          <TabsTrigger value="request" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Nuova Richiesta</span>
            <span className="sm:hidden">Nuova</span>
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Storico</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="request" className="mt-4 sm:mt-6">
          <EmployeeLeaveRequestSection />
        </TabsContent>

        <TabsContent value="archive" className="mt-4 sm:mt-6">
          <EmployeeLeaveArchiveSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
