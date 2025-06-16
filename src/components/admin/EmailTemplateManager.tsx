
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Bell, CheckCircle, Mail } from "lucide-react";
import DocumentTemplateEditor from "./DocumentTemplateEditor";
import NotificationTemplateEditor from "./NotificationTemplateEditor";
import ApprovalTemplateEditor from "./ApprovalTemplateEditor";

const EmailTemplateManager = () => {
  const [activeTab, setActiveTab] = useState("documenti");

  return (
    <Card className="max-w-7xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-6 h-6" />
          Gestione Modelli Email
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="documenti" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documenti
            </TabsTrigger>
            <TabsTrigger value="notifiche" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifiche
            </TabsTrigger>
            <TabsTrigger value="approvazioni" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Approvazioni
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documenti" className="mt-6">
            <DocumentTemplateEditor />
          </TabsContent>

          <TabsContent value="notifiche" className="mt-6">
            <NotificationTemplateEditor />
          </TabsContent>

          <TabsContent value="approvazioni" className="mt-6">
            <ApprovalTemplateEditor />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EmailTemplateManager;
