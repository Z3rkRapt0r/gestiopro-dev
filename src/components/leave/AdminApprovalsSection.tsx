
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LeaveRequestsCardsGrid from "./LeaveRequestsCardsGrid";
import EmployeeLeaveArchive from "./EmployeeLeaveArchive";
import { EmployeeLeaveBalanceSection } from "./EmployeeLeaveBalanceSection";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { Settings } from "lucide-react";

export default function AdminApprovalsSection() {
  const [tab, setTab] = useState<"pending" | "archive-permessi" | "archive-ferie" | "balance">("pending");
  const { leaveRequests, isLoading } = useLeaveRequests();

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
      <h2 className="text-2xl font-bold mb-4">Approvazioni Permessi & Ferie</h2>
      <Tabs value={tab} onValueChange={val => setTab(val as any)} className="w-full">
        <TabsList className="mb-4 w-full flex">
          <TabsTrigger value="pending" className="flex-1">Pendenti</TabsTrigger>
          <TabsTrigger value="archive-permessi" className="flex-1">Archivio Permessi</TabsTrigger>
          <TabsTrigger value="archive-ferie" className="flex-1">Archivio Ferie</TabsTrigger>
          <TabsTrigger value="balance" className="flex-1 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Bilanci
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <LeaveRequestsCardsGrid
            adminMode
            leaveRequests={pendingRequests}
            showEdit
            showDelete
          />
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
        <TabsContent value="balance">
          <EmployeeLeaveBalanceSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
