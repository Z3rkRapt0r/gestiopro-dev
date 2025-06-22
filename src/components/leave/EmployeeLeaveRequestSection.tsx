
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeaveRequestForm from "./LeaveRequestForm";
import { Calendar, Clock } from "lucide-react";

export function EmployeeLeaveRequestSection() {
  const [activeTab, setActiveTab] = useState<"ferie" | "permesso">("ferie");

  const handleSuccess = () => {
    // Refresh the page or show success message
    window.location.reload();
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
    </div>
  );
}
