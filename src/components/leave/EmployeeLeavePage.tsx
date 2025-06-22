
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminApprovalsSection from "./AdminApprovalsSection";
import { EmployeeLeaveBalanceSection } from "./EmployeeLeaveBalanceSection";
import { EmployeeLeaveRequestSection } from "./EmployeeLeaveRequestSection";
import { EmployeeLeaveArchiveSection } from "./EmployeeLeaveArchiveSection";
import { CalendarDays, FileText, UserCheck, Settings } from "lucide-react";

export default function EmployeeLeavePage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestione Permessi e Ferie</h1>
      </div>

      <Tabs defaultValue={isAdmin ? "approvals" : "request"} className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-2'}`}>
          {isAdmin && (
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Approvazioni
            </TabsTrigger>
          )}
          <TabsTrigger value="request" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Nuova Richiesta
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Storico
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="balance" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Bilanci
            </TabsTrigger>
          )}
        </TabsList>

        {isAdmin && (
          <TabsContent value="approvals">
            <AdminApprovalsSection />
          </TabsContent>
        )}

        <TabsContent value="request">
          <EmployeeLeaveRequestSection />
        </TabsContent>

        <TabsContent value="archive">
          <EmployeeLeaveArchiveSection />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="balance">
            <EmployeeLeaveBalanceSection />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
