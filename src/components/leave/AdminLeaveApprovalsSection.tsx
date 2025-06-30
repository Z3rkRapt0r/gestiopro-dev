
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import LeaveRequestsCardsGrid from "./LeaveRequestsCardsGrid";
import EmployeeLeaveArchive from "./EmployeeLeaveArchive";
import { ManualLeaveEntryForm } from "./ManualLeaveEntryForm";
import { EmployeeLeaveBalanceSection } from "./EmployeeLeaveBalanceSection";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useLeaveBalanceSync } from "@/hooks/useLeaveBalanceSync";
import { Settings, Plus, Calendar, FileText, Archive } from "lucide-react";

export default function AdminLeaveApprovalsSection() {
  const [tab, setTab] = useState<"pending" | "manual-entry" | "balance-settings" | "archive-permessi" | "archive-ferie">("pending");
  const { leaveRequests, isLoading } = useLeaveRequests();
  const { invalidateBalanceQueries } = useLeaveBalanceSync();
  const queryClient = useQueryClient();

  // Aggiorna i dati quando si cambia tab
  useEffect(() => {
    console.log('Cambio tab permessi, invalidando tutte le query dei bilanci...');
    // Invalida tutte le query principali per aggiornare i dati in tempo reale
    queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
    queryClient.invalidateQueries({ queryKey: ['employee-leave-balance'] });
    queryClient.invalidateQueries({ queryKey: ['employee-leave-balance-stats'] });
    queryClient.invalidateQueries({ queryKey: ['leave_balance_validation'] });
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
    invalidateBalanceQueries();
  }, [tab, queryClient, invalidateBalanceQueries]);

  // Archivio diviso per tipo
  const archivePermessi = (leaveRequests ?? []).filter(
    (x) => x.status === "approved" && x.type === "permesso"
  );
  const archiveFerie = (leaveRequests ?? []).filter(
    (x) => x.status === "approved" && x.type === "ferie"
  );

  // Solo pending
  const pendingRequests = (leaveRequests ?? []).filter((x) => x.status === "pending");

  // Raggruppa per dipendente
  const groupByEmployee = (requests: typeof leaveRequests) => {
    const grouped = new Map();
    
    requests?.forEach(req => {
      const employeeKey = req.user_id;
      if (!grouped.has(employeeKey)) {
        grouped.set(employeeKey, {
          employee: {
            id: req.user_id,
            first_name: req.profiles?.first_name || null,
            last_name: req.profiles?.last_name || null,
            email: req.profiles?.email || null,
          },
          requests: []
        });
      }
      grouped.get(employeeKey).requests.push(req);
    });
    
    return Array.from(grouped.values()).sort((a, b) => {
      const nameA = `${a.employee.first_name || ''} ${a.employee.last_name || ''}`.trim();
      const nameB = `${b.employee.first_name || ''} ${b.employee.last_name || ''}`.trim();
      return nameA.localeCompare(nameB);
    });
  };

  const groupedPermessi = groupByEmployee(archivePermessi);
  const groupedFerie = groupByEmployee(archiveFerie);

  return (
    <div className="w-full max-w-none px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Gestione Permessi & Ferie</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Gestisci le richieste di permessi e ferie dei dipendenti
        </p>
      </div>

      <Tabs value={tab} onValueChange={val => setTab(val as any)} className="w-full">
        {/* Mobile-optimized tabs with horizontal scroll */}
        <div className="w-full overflow-x-auto">
          <TabsList className="mb-4 min-w-full flex sm:grid sm:grid-cols-5 h-auto sm:h-11 bg-muted/30 p-1">
            <TabsTrigger 
              value="pending" 
              className="flex-shrink-0 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-0"
            >
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden xs:inline">Approvazioni</span>
              <span className="xs:hidden">App.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="manual-entry" 
              className="flex-shrink-0 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-0"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Caricamento Manuale</span>
              <span className="sm:hidden">Manuale</span>
            </TabsTrigger>
            <TabsTrigger 
              value="balance-settings" 
              className="flex-shrink-0 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-0"
            >
              <Settings className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Impostazioni</span>
              <span className="sm:hidden">Impost.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="archive-permessi" 
              className="flex-shrink-0 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-0"
            >
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Archivio Permessi</span>
              <span className="sm:hidden">Permessi</span>
            </TabsTrigger>
            <TabsTrigger 
              value="archive-ferie" 
              className="flex-shrink-0 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-0"
            >
              <Archive className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Archivio Ferie</span>
              <span className="sm:hidden">Ferie</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pending" className="mt-4 sm:mt-6 focus-visible:outline-none focus-visible:ring-0">
          <LeaveRequestsCardsGrid
            adminMode
            leaveRequests={pendingRequests}
            showEdit
            showDelete
          />
        </TabsContent>
        
        <TabsContent value="manual-entry" className="mt-4 sm:mt-6 focus-visible:outline-none focus-visible:ring-0">
          <ManualLeaveEntryForm 
            onSuccess={() => {
              setTab("pending");
            }}
          />
        </TabsContent>
        
        <TabsContent value="balance-settings" className="mt-4 sm:mt-6 focus-visible:outline-none focus-visible:ring-0">
          <EmployeeLeaveBalanceSection />
        </TabsContent>
        
        <TabsContent value="archive-permessi" className="mt-4 sm:mt-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="space-y-3 sm:space-y-4">
            {groupedPermessi.length > 0 ? (
              groupedPermessi.map(({ employee, requests }) => (
                <EmployeeLeaveArchive
                  key={employee.id}
                  employee={employee}
                  leaveRequests={requests}
                  type="permesso"
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm sm:text-base">
                Nessun permesso approvato trovato.
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="archive-ferie" className="mt-4 sm:mt-6 focus-visible:outline-none focus-visible:ring-0">
          <div className="space-y-3 sm:space-y-4">
            {groupedFerie.length > 0 ? (
              groupedFerie.map(({ employee, requests }) => (
                <EmployeeLeaveArchive
                  key={employee.id}
                  employee={employee}
                  leaveRequests={requests}
                  type="ferie"
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm sm:text-base">
                Nessuna ferie approvata trovata.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
