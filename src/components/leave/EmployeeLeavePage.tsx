
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeLeaveRequestSection } from "./EmployeeLeaveRequestSection";
import { EmployeeLeaveArchiveSection } from "./EmployeeLeaveArchiveSection";
import { CalendarDays, FileText } from "lucide-react";

export default function EmployeeLeavePage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestione Permessi e Ferie</h1>
      </div>

      <Tabs defaultValue="request" className="w-full">
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
