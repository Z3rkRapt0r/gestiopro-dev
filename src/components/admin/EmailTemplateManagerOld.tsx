
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Bell, CheckCircle, Mail, Calendar, UserCheck, UserX, Users, User, Clock, Plane, AlertTriangle, Settings, Palette, Send, MessageSquare, FileCheck, UserPlus, UserMinus, Zap } from "lucide-react";
import DocumentTemplateEditor from "./DocumentTemplateEditor";
import NotificationTemplateEditor from "./NotificationTemplateEditor";
import PermissionRequestTemplateEditor from "./PermissionRequestTemplateEditor";
import VacationRequestTemplateEditor from "./VacationRequestTemplateEditor";
import PermissionApprovalTemplateEditor from "./PermissionApprovalTemplateEditor";
import VacationApprovalTemplateEditor from "./VacationApprovalTemplateEditor";
import PermissionRejectionTemplateEditor from "./PermissionRejectionTemplateEditor";
import VacationRejectionTemplateEditor from "./VacationRejectionTemplateEditor";
import AttendanceAlertTemplateEditor from "./AttendanceAlertTemplateEditor";
import EmailTemplateEditor from "./EmailTemplateEditor";
import GlobalLogoSection from "./GlobalLogoSection";

const EmailTemplateManager = () => {
  const [activeTab, setActiveTab] = useState("global-settings");
  const [activeAdminSubTab, setActiveAdminSubTab] = useState("documenti");
  const [activeEmployeeSubTab, setActiveEmployeeSubTab] = useState("documenti");

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header con descrizione */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <span className="text-gray-900">Gestione Modelli Email</span>
              <p className="text-sm font-normal text-gray-600 mt-1">
                Personalizza tutti i template email del sistema con design e contenuti personalizzati
              </p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-gray-100">
          <TabsTrigger value="global-settings" className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium">Configurazione Globale</span>
          </TabsTrigger>
          <TabsTrigger value="admin-templates" className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">Email Amministratore</span>
            <Badge variant="secondary" className="text-xs">Invio</Badge>
          </TabsTrigger>
          <TabsTrigger value="employee-templates" className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <User className="w-5 h-5" />
            <span className="text-sm font-medium">Email Dipendente</span>
            <Badge variant="outline" className="text-xs">Invio</Badge>
          </TabsTrigger>
          <TabsTrigger value="system-templates" className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Zap className="w-5 h-5" />
            <span className="text-sm font-medium">Sistema</span>
            <Badge variant="secondary" className="text-xs">Auto</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global-settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Configurazione Globale
              </CardTitle>
              <p className="text-sm text-gray-600">
                Impostazioni che si applicano a tutti i template email del sistema
              </p>
            </CardHeader>
            <CardContent>
              <GlobalLogoSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin-templates" className="space-y-6">
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Send className="w-5 h-5" />
                Template Email Amministratore → Dipendente
              </CardTitle>
              <p className="text-sm text-green-700">
                Questi template vengono utilizzati quando l'amministratore invia email ai dipendenti
              </p>
            </CardHeader>
          </Card>

            <Tabs value={activeAdminSubTab} onValueChange={setActiveAdminSubTab}>
              <TabsList className="grid w-full grid-cols-9">
                <TabsTrigger value="documenti" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documenti
                </TabsTrigger>
                <TabsTrigger value="notifiche" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifiche
                </TabsTrigger>
                <TabsTrigger value="employee-message" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Messaggi Dipendenti
                </TabsTrigger>
                <TabsTrigger value="permessi-richiesta" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Richieste Permessi
                </TabsTrigger>
                <TabsTrigger value="ferie-richiesta" className="flex items-center gap-2">
                  <Plane className="w-4 h-4" />
                  Richieste Ferie
                </TabsTrigger>
                <TabsTrigger value="permessi-approvazione" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Permessi OK
                </TabsTrigger>
                <TabsTrigger value="ferie-approvazione" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
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
                  defaultContent=""
                  defaultSubject=""
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

              <TabsContent value="avviso-entrata" className="mt-6">
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">Template Avviso Entrata Mancante</h4>
                  <p className="text-sm text-orange-700">
                    Template utilizzato per avvisare automaticamente i dipendenti che non registrano l'entrata.
                    Usa <code>{'{employee_name}'}</code> per il nome del dipendente, <code>{'{expected_time}'}</code> per l'orario previsto,
                    e <code>{'{current_time}'}</code> per l'orario attuale.
                  </p>
                  <div className="mt-3 p-3 bg-orange-100 rounded border-l-4 border-orange-400">
                    <p className="text-sm text-orange-800 font-medium">
                      ⚙️ Configurazione: Il tempo di attesa e l'attivazione del servizio si configurano nelle Impostazioni Presenze.
                    </p>
                  </div>
                </div>
                <AttendanceAlertTemplateEditor 
                  templateCategory="amministratori"
                  defaultContent=""
                  defaultSubject=""
                  subjectEditable={true}
                  contentEditable={true}
                />
              </TabsContent>

              <TabsContent value="employee-message" className="mt-6">
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Template per Messaggi Dipendenti</h4>
                  <p className="text-sm text-blue-700">
                    Template utilizzato quando i dipendenti inviano messaggi agli amministratori.
                    Usa <code>{'{employeeName}'}</code>, <code>{'{messageTitle}'}</code> e <code>{'{message}'}</code> per personalizzare il messaggio.
                  </p>
                </div>
                <EmailTemplateEditor
                  templateType="employee-message"
                  templateCategory="amministratori"
                  defaultSubject=""
                  defaultContent=""
                  subjectEditable={true}
                  contentEditable={true}
                />
              </TabsContent>

              <TabsContent value="permessi-richiesta" className="mt-6">
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">Template per Richieste Permessi</h4>
                  <p className="text-sm text-orange-700">
                    Template utilizzato quando i dipendenti inviano richieste di permesso agli amministratori.
                    Usa <code>{'{employeeName}'}</code>, <code>{'{leaveDetails}'}</code> e <code>{'{employeeNote}'}</code> per personalizzare il messaggio.
                  </p>
                </div>
                <EmailTemplateEditor
                  templateType="permessi-richiesta"
                  templateCategory="amministratori"
                  defaultSubject=""
                  defaultContent=""
                  subjectEditable={true}
                  contentEditable={true}
                />
              </TabsContent>

              <TabsContent value="ferie-richiesta" className="mt-6">
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">Template per Richieste Ferie</h4>
                  <p className="text-sm text-orange-700">
                    Template utilizzato quando i dipendenti inviano richieste di ferie agli amministratori.
                    Usa <code>{'{employeeName}'}</code>, <code>{'{leaveDetails}'}</code> e <code>{'{employeeNote}'}</code> per personalizzare il messaggio.
                  </p>
                </div>
                <EmailTemplateEditor
                  templateType="ferie-richiesta"
                  templateCategory="amministratori"
                  defaultSubject=""
                  defaultContent=""
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
                  defaultContent=""
                  defaultSubject=""
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
