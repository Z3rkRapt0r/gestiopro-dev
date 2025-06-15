
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LeaveRequestsTable from "./LeaveRequestsTable";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";

export default function AdminApprovalsSection() {
  const [tab, setTab] = useState<"pending" | "archive-permessi" | "archive-ferie">("pending");
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

  return (
    <div className="max-w-6xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-4">Approvazioni Permessi & Ferie</h2>
      <Tabs value={tab} onValueChange={val => setTab(val as any)} className="w-full">
        <TabsList className="mb-4 w-full flex">
          <TabsTrigger value="pending" className="flex-1">Pendenti</TabsTrigger>
          <TabsTrigger value="archive-permessi" className="flex-1">Archivio Permessi</TabsTrigger>
          <TabsTrigger value="archive-ferie" className="flex-1">Archivio Ferie</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <LeaveRequestsTable
            adminMode
            leaveRequests={pendingRequests}
            showEdit
            showDelete
          />
        </TabsContent>
        <TabsContent value="archive-permessi">
          <LeaveRequestsTable
            adminMode
            leaveRequests={archivePermessi}
            archive
            showEdit
            showDelete
          />
        </TabsContent>
        <TabsContent value="archive-ferie">
          <LeaveRequestsTable
            adminMode
            leaveRequests={archiveFerie}
            archive
            showEdit
            showDelete
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
