
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
  const [activeAdminSubTab, setActiveAdminSubTab] = useState("documenti");
  const [activeEmployeeSubTab, setActiveEmployeeSubTab] = useState("documenti");

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
            <TabsTrigger value="global-logo" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Logo Globale
            </TabsTrigger>
            <TabsTrigger value="admin-templates" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Email inviate dall'Amministratore
            </TabsTrigger>
            <TabsTrigger value="employee-templates" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Email inviate dal Dipendente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global-logo" className="mt-6">
            <GlobalLogoSection />
          </TabsContent>

          <TabsContent value="admin-templates" className="mt-6">
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Template Email inviate dall'Amministratore</h3>
              <p className="text-sm text-green-700">
                Questi template vengono utilizzati quando l'amministratore invia email ai dipendenti. 
                <strong>Nota:</strong> I template per Documenti e Notifiche hanno oggetto e contenuto fissi (non modificabili) 
                poiché vengono personalizzati durante l'invio.
              </p>
            </div>

            <Tabs value={activeAdminSubTab} onValueChange={setActiveAdminSubTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="documenti" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documenti
                </TabsTrigger>
                <TabsTrigger value="notifiche" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifiche
                </TabsTrigger>
                <TabsTrigger value="permessi-approvazione" className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  P/F Approvate
                </TabsTrigger>
                <TabsTrigger value="permessi-rifiuto" className="flex items-center gap-2">
                  <UserX className="w-4 h-4" />
                  P/F Rifiutate
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documenti" className="mt-6">
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">Template Documenti per Dipendenti</h4>
                  <p className="text-sm text-yellow-700">
                    <strong>Attenzione:</strong> Oggetto e contenuto di questo template non sono modificabili 
                    poiché vengono personalizzati automaticamente quando l'amministratore carica un documento.
                  </p>
                </div>
                <DocumentTemplateEditor 
                  templateType="documenti" 
                  templateCategory="amministratori"
                  defaultContent="È disponibile un nuovo documento per te. Il documento contiene informazioni importanti che richiedono la tua attenzione."
                  defaultSubject="Nuovo Documento Disponibile"
                  subjectEditable={false}
                  contentEditable={false}
                />
              </TabsContent>

              <TabsContent value="notifiche" className="mt-6">
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">Template Notifiche per Dipendenti</h4>
                  <p className="text-sm text-yellow-700">
                    <strong>Attenzione:</strong> Oggetto e contenuto di questo template non sono modificabili 
                    poiché vengono personalizzati automaticamente quando l'amministratore invia una notifica.
                  </p>
                </div>
                <NotificationTemplateEditor 
                  templateCategory="amministratori"
                  defaultContent="Hai ricevuto una nuova notifica dall'amministrazione. Controlla i dettagli nella dashboard."
                  defaultSubject="Nuova Notifica dall'Amministrazione"
                  subjectEditable={false}
                  contentEditable={false}
                />
              </TabsContent>

              <TabsContent value="permessi-approvazione" className="mt-6">
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Template per Approvazioni Permessi/Ferie</h4>
                  <p className="text-sm text-blue-700">
                    Questo template viene utilizzato quando l'amministratore approva una richiesta di permesso o ferie.
                  </p>
                </div>
                <LeaveApprovalTemplateEditor templateCategory="amministratori" />
              </TabsContent>

              <TabsContent value="permessi-rifiuto" className="mt-6">
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Template per Rifiuti Permessi/Ferie</h4>
                  <p className="text-sm text-blue-700">
                    Questo template viene utilizzato quando l'amministratore rifiuta una richiesta di permesso o ferie.
                  </p>
                </div>
                <LeaveRejectionTemplateEditor templateCategory="amministratori" />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="employee-templates" className="mt-6">
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Template Email inviate dal Dipendente</h3>
              <p className="text-sm text-blue-700">
                Questi template vengono utilizzati quando i dipendenti inviano email agli amministratori. 
                Tutti i campi sono modificabili per personalizzare i messaggi.
              </p>
            </div>

            <Tabs value={activeEmployeeSubTab} onValueChange={setActiveEmployeeSubTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="documenti" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documenti
                </TabsTrigger>
                <TabsTrigger value="notifiche" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifiche
                </TabsTrigger>
                <TabsTrigger value="permessi-richiesta" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Richieste P/F
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documenti" className="mt-6">
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Template Documenti per Amministratori</h4>
                  <p className="text-sm text-green-700">
                    Questo template viene utilizzato quando un dipendente carica un documento e viene inviata 
                    una notifica agli amministratori.
                  </p>
                </div>
                <DocumentTemplateEditor 
                  templateType="documenti" 
                  templateCategory="dipendenti"
                  defaultContent="È disponibile un nuovo documento caricato da un dipendente per la tua revisione. Il documento contiene informazioni che richiedono la tua attenzione."
                  defaultSubject="Nuovo Documento da Dipendente"
                  subjectEditable={true}
                  contentEditable={true}
                />
              </TabsContent>

              <TabsContent value="notifiche" className="mt-6">
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Template Notifiche per Amministratori</h4>
                  <p className="text-sm text-green-700">
                    Questo template viene utilizzato quando un dipendente invia una notifica agli amministratori.
                  </p>
                </div>
                <NotificationTemplateEditor 
                  templateCategory="dipendenti"
                  defaultContent="Un dipendente ha inviato una nuova notifica che richiede la tua attenzione. Controlla i dettagli nella dashboard."
                  defaultSubject="Nuova Notifica da Dipendente"
                  subjectEditable={true}
                  contentEditable={true}
                />
              </TabsContent>

              <TabsContent value="permessi-richiesta" className="mt-6">
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Template Richieste Permessi/Ferie</h4>
                  <p className="text-sm text-green-700">
                    Questo template viene utilizzato quando un dipendente invia una richiesta di permesso 
                    o ferie agli amministratori.
                  </p>
                </div>
                <LeaveRequestTemplateEditor templateCategory="dipendenti" />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EmailTemplateManager;
