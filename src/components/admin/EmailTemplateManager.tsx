
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Bell, CheckCircle, Mail, Calendar, UserCheck, UserX, Users, User, Clock, Plane } from "lucide-react";
import DocumentTemplateEditor from "./DocumentTemplateEditor";
import NotificationTemplateEditor from "./NotificationTemplateEditor";
import PermissionRequestTemplateEditor from "./PermissionRequestTemplateEditor";
import VacationRequestTemplateEditor from "./VacationRequestTemplateEditor";
import PermissionApprovalTemplateEditor from "./PermissionApprovalTemplateEditor";
import VacationApprovalTemplateEditor from "./VacationApprovalTemplateEditor";
import PermissionRejectionTemplateEditor from "./PermissionRejectionTemplateEditor";
import VacationRejectionTemplateEditor from "./VacationRejectionTemplateEditor";
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
              </p>
            </div>

            <Tabs value={activeAdminSubTab} onValueChange={setActiveAdminSubTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="documenti" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documenti
                </TabsTrigger>
                <TabsTrigger value="notifiche" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifiche
                </TabsTrigger>
                <TabsTrigger value="permessi-approvazione" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Permessi OK
                </TabsTrigger>
                <TabsTrigger value="ferie-approvazione" className="flex items-center gap-2">
                  <Plane className="w-4 h-4" />
                  Ferie OK
                </TabsTrigger>
                <TabsTrigger value="permessi-rifiuto" className="flex items-center gap-2">
                  <UserX className="w-4 h-4" />
                  Permessi NO
                </TabsTrigger>
                <TabsTrigger value="ferie-rifiuto" className="flex items-center gap-2">
                  <UserX className="w-4 h-4" />
                  Ferie NO
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documenti" className="mt-6">
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Template Documenti per Dipendenti</h4>
                  <p className="text-sm text-blue-700">
                    Template utilizzato quando l'amministratore carica un documento per un dipendente.
                    Puoi personalizzare oggetto e contenuto. Usa <code>{'{employee_name}'}</code> per il nome del dipendente.
                  </p>
                </div>
                <DocumentTemplateEditor 
                  templateType="documenti" 
                  templateCategory="amministratori"
                  defaultContent="Gentile {employee_name},\n\nÈ disponibile un nuovo documento per te. Il documento contiene informazioni importanti che richiedono la tua attenzione.\n\nAccedi alla dashboard per visualizzare il documento."
                  defaultSubject="Nuovo Documento Disponibile"
                  subjectEditable={true}
                  contentEditable={true}
                />
              </TabsContent>

              <TabsContent value="notifiche" className="mt-6">
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Template Notifiche per Dipendenti</h4>
                  <p className="text-sm text-blue-700">
                    Template utilizzato quando l'amministratore invia una notifica ai dipendenti.
                    Puoi personalizzare oggetto e contenuto.
                  </p>
                </div>
                <NotificationTemplateEditor 
                  templateCategory="amministratori"
                  defaultContent="Hai ricevuto una nuova notifica dall'amministrazione. Controlla i dettagli nella dashboard."
                  defaultSubject="Nuova Notifica dall'Amministrazione"
                  subjectEditable={true}
                  contentEditable={true}
                />
              </TabsContent>

              <TabsContent value="permessi-approvazione" className="mt-6">
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Template per Approvazioni Permessi</h4>
                  <p className="text-sm text-green-700">
                    Template utilizzato quando l'amministratore approva una richiesta di permesso.
                    Usa <code>{'{employee_name}'}</code> e <code>{'{leave_details}'}</code> per personalizzare il messaggio.
                  </p>
                </div>
                <PermissionApprovalTemplateEditor templateCategory="amministratori" />
              </TabsContent>

              <TabsContent value="ferie-approvazione" className="mt-6">
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Template per Approvazioni Ferie</h4>
                  <p className="text-sm text-green-700">
                    Template utilizzato quando l'amministratore approva una richiesta di ferie.
                    Usa <code>{'{employee_name}'}</code> e <code>{'{leave_details}'}</code> per personalizzare il messaggio.
                  </p>
                </div>
                <VacationApprovalTemplateEditor templateCategory="amministratori" />
              </TabsContent>

              <TabsContent value="permessi-rifiuto" className="mt-6">
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">Template per Rifiuti Permessi</h4>
                  <p className="text-sm text-red-700">
                    Template utilizzato quando l'amministratore rifiuta una richiesta di permesso.
                    Usa <code>{'{employee_name}'}</code> e <code>{'{leave_details}'}</code> per personalizzare il messaggio.
                  </p>
                </div>
                <PermissionRejectionTemplateEditor templateCategory="amministratori" />
              </TabsContent>

              <TabsContent value="ferie-rifiuto" className="mt-6">
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">Template per Rifiuti Ferie</h4>
                  <p className="text-sm text-red-700">
                    Template utilizzato quando l'amministratore rifiuta una richiesta di ferie.
                    Usa <code>{'{employee_name}'}</code> e <code>{'{leave_details}'}</code> per personalizzare il messaggio.
                  </p>
                </div>
                <VacationRejectionTemplateEditor templateCategory="amministratori" />
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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="documenti" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documenti
                </TabsTrigger>
                <TabsTrigger value="notifiche" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifiche
                </TabsTrigger>
                <TabsTrigger value="permessi-richiesta" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Richieste Permessi
                </TabsTrigger>
                <TabsTrigger value="ferie-richiesta" className="flex items-center gap-2">
                  <Plane className="w-4 h-4" />
                  Richieste Ferie
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documenti" className="mt-6">
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Template Documenti per Amministratori</h4>
                  <p className="text-sm text-green-700">
                    Template utilizzato quando un dipendente carica un documento e invia notifica agli amministratori.
                    Usa <code>{'{employee_name}'}</code> per il nome del dipendente e <code>{'{employee_note}'}</code> per le note del dipendente.
                  </p>
                </div>
                <DocumentTemplateEditor 
                  templateType="documenti" 
                  templateCategory="dipendenti"
                  defaultContent="È disponibile un nuovo documento caricato da {employee_name} per la tua revisione.\n\nNote del dipendente:\n{employee_note}\n\nIl documento contiene informazioni che richiedono la tua attenzione."
                  defaultSubject="Nuovo Documento da {employee_name}"
                  subjectEditable={true}
                  contentEditable={true}
                />
              </TabsContent>

              <TabsContent value="notifiche" className="mt-6">
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Template Notifiche per Amministratori</h4>
                  <p className="text-sm text-green-700">
                    Template utilizzato quando un dipendente invia una notifica agli amministratori.
                    Usa <code>{'{employee_name}'}</code> per personalizzare il messaggio.
                  </p>
                </div>
                <NotificationTemplateEditor 
                  templateCategory="dipendenti"
                  defaultContent="{employee_name} ha inviato una nuova notifica che richiede la tua attenzione. Controlla i dettagli nella dashboard."
                  defaultSubject="Nuova Notifica da {employee_name}"
                  subjectEditable={true}
                  contentEditable={true}
                />
              </TabsContent>

              <TabsContent value="permessi-richiesta" className="mt-6">
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Template Richieste Permessi</h4>
                  <p className="text-sm text-green-700">
                    Template utilizzato quando un dipendente invia una richiesta di permesso agli amministratori.
                    Usa <code>{'{employee_name}'}</code> per personalizzare il messaggio.
                  </p>
                </div>
                <PermissionRequestTemplateEditor templateCategory="dipendenti" />
              </TabsContent>

              <TabsContent value="ferie-richiesta" className="mt-6">
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Template Richieste Ferie</h4>
                  <p className="text-sm text-green-700">
                    Template utilizzato quando un dipendente invia una richiesta di ferie agli amministratori.
                    Usa <code>{'{employee_name}'}</code> per personalizzare il messaggio.
                  </p>
                </div>
                <VacationRequestTemplateEditor templateCategory="dipendenti" />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EmailTemplateManager;
