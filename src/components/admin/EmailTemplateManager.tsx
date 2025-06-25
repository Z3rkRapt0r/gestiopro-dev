
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Bell, CheckCircle, Mail, Calendar, UserCheck, UserX, Users, User } from "lucide-react";
import DocumentTemplateEditor from "./DocumentTemplateEditor";
import NotificationTemplateEditor from "./NotificationTemplateEditor";
import ApprovalTemplateEditor from "./ApprovalTemplateEditor";
import LeaveRequestTemplateEditor from "./LeaveRequestTemplateEditor";
import LeaveApprovalTemplateEditor from "./LeaveApprovalTemplateEditor";
import LeaveRejectionTemplateEditor from "./LeaveRejectionTemplateEditor";
import GlobalLogoSection from "./GlobalLogoSection";

const EmailTemplateManager = () => {
  const [activeTab, setActiveTab] = useState("global-logo");

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
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="global-logo" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Logo Globale
            </TabsTrigger>
            <TabsTrigger value="documenti-dipendenti" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Doc. Dipendenti
            </TabsTrigger>
            <TabsTrigger value="permessi-dipendenti" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Permessi Dipendenti
            </TabsTrigger>
            <TabsTrigger value="notifiche-dipendenti" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notif. Dipendenti
            </TabsTrigger>
            <TabsTrigger value="documenti-admin" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Doc. Admin
            </TabsTrigger>
            <TabsTrigger value="permessi-approvazione" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              P/F Approvate
            </TabsTrigger>
            <TabsTrigger value="permessi-rifiuto" className="flex items-center gap-2">
              <UserX className="w-4 h-4" />
              P/F Rifiutate
            </TabsTrigger>
            <TabsTrigger value="notifiche-admin" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Notif. Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global-logo" className="mt-6">
            <GlobalLogoSection />
          </TabsContent>

          <TabsContent value="documenti-dipendenti" className="mt-6">
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Template per Notifiche agli Amministratori</h3>
              <p className="text-sm text-blue-700">
                Questo template viene utilizzato quando un dipendente carica un documento e viene inviata una notifica agli amministratori.
              </p>
            </div>
            <DocumentTemplateEditor 
              templateType="documenti" 
              templateCategory="dipendenti"
              defaultContent="È disponibile un nuovo documento caricato da un dipendente per la tua revisione. Il documento contiene informazioni che richiedono la tua attenzione."
              defaultSubject="Nuovo Documento da Dipendente"
            />
          </TabsContent>

          <TabsContent value="permessi-dipendenti" className="mt-6">
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Template per Richieste Permessi/Ferie</h3>
              <p className="text-sm text-blue-700">
                Questo template viene utilizzato quando un dipendente invia una richiesta di permesso o ferie agli amministratori.
              </p>
            </div>
            <LeaveRequestTemplateEditor 
              templateCategory="dipendenti"
            />
          </TabsContent>

          <TabsContent value="notifiche-dipendenti" className="mt-6">
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Template per Notifiche da Dipendenti</h3>
              <p className="text-sm text-blue-700">
                Questo template viene utilizzato quando un dipendente invia una notifica agli amministratori.
              </p>
            </div>
            <NotificationTemplateEditor 
              templateCategory="dipendenti"
              defaultContent="Un dipendente ha inviato una nuova notifica che richiede la tua attenzione. Controlla i dettagli nella dashboard."
              defaultSubject="Nuova Notifica da Dipendente"
            />
          </TabsContent>

          <TabsContent value="documenti-admin" className="mt-6">
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Template per Documenti agli Dipendenti</h3>
              <p className="text-sm text-green-700">
                Questo template viene utilizzato quando un amministratore invia un documento a un dipendente.
              </p>
            </div>
            <DocumentTemplateEditor 
              templateType="documenti" 
              templateCategory="amministratori"
              defaultContent="È disponibile un nuovo documento per te. Il documento contiene informazioni importanti che richiedono la tua attenzione."
              defaultSubject="Nuovo Documento Disponibile"
            />
          </TabsContent>

          <TabsContent value="permessi-approvazione" className="mt-6">
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Template per Approvazioni</h3>
              <p className="text-sm text-green-700">
                Questo template viene utilizzato quando un amministratore approva una richiesta di permesso o ferie.
              </p>
            </div>
            <LeaveApprovalTemplateEditor 
              templateCategory="amministratori"
            />
          </TabsContent>

          <TabsContent value="permessi-rifiuto" className="mt-6">
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Template per Rifiuti</h3>
              <p className="text-sm text-green-700">
                Questo template viene utilizzato quando un amministratore rifiuta una richiesta di permesso o ferie.
              </p>
            </div>
            <LeaveRejectionTemplateEditor 
              templateCategory="amministratori"
            />
          </TabsContent>

          <TabsContent value="notifiche-admin" className="mt-6">
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Template per Notifiche ai Dipendenti</h3>
              <p className="text-sm text-green-700">
                Questo template viene utilizzato quando un amministratore invia una notifica ai dipendenti.
              </p>
            </div>
            <NotificationTemplateEditor 
              templateCategory="amministratori"
              defaultContent="Hai ricevuto una nuova notifica dall'amministrazione. Controlla i dettagli nella dashboard."
              defaultSubject="Nuova Notifica dall'Amministrazione"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EmailTemplateManager;
