
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LeaveRequestsCardsGrid from "./LeaveRequestsCardsGrid";
import EmployeeLeaveArchive from "./EmployeeLeaveArchive";
import { ManualLeaveEntryForm } from "./ManualLeaveEntryForm";
import { EmployeeLeaveBalanceSection } from "./EmployeeLeaveBalanceSection";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useLeaveBalanceSync } from "@/hooks/useLeaveBalanceSync";
import { Settings, Plus, Calendar, FileText } from "lucide-react";

export default function AdminLeaveApprovalsSection() {
  const [tab, setTab] = useState<"pending" | "manual-entry" | "balance-settings" | "archive-permessi" | "archive-ferie">("pending");
  const { leaveRequests, isLoading } = useLeaveRequests();
  const { invalidateBalanceQueries } = useLeaveBalanceSync();

  // Aggiorna i dati quando si cambia sezione
  useEffect(() => {
    invalidateBalanceQueries();
  }, [tab, invalidateBalanceQueries]);

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
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Gestione Permessi & Ferie</h2>
        <p className="text-muted-foreground">
          Gestisci le richieste di permessi e ferie dei dipendenti
        </p>
      </div>

      <Tabs value={tab} onValueChange={val => setTab(val as any)} className="w-full">
        <TabsList className="mb-4 w-full flex">
          <TabsTrigger value="pending" className="flex-1 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Approvazioni
          </TabsTrigger>
          <TabsTrigger value="manual-entry" className="flex-1 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Caricamento Manuale
          </TabsTrigger>
          <TabsTrigger value="balance-settings" className="flex-1 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Impostazioni Ferie/Permessi
          </TabsTrigger>
          <TabsTrigger value="archive-permessi" className="flex-1">Archivio Permessi</TabsTrigger>
          <TabsTrigger value="archive-ferie" className="flex-1">Archivio Ferie</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <LeaveRequestsCardsGrid
            adminMode
            leaveRequests={pendingRequests}
            showEdit
            showDelete
          />
        </TabsContent>
        <TabsContent value="manual-entry">
          <ManualLeaveEntryForm 
            onSuccess={() => {
              // Torna alla tab pending dopo il successo
              setTab("pending");
            }}
          />
        </TabsContent>
        <TabsContent value="balance-settings">
          <EmployeeLeaveBalanceSection />
        </TabsContent>
        <TabsContent value="archive-permessi">
          <div className="space-y-4">
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
              <div className="text-center py-8 text-muted-foreground">
                Nessun permesso approvato trovato.
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="archive-ferie">
          <div className="space-y-4">
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
              <div className="text-center py-8 text-muted-foreground">
                Nessuna ferie approvata trovata.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
