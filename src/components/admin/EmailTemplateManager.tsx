import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, Bell, CheckCircle, Mail, Calendar, UserCheck, UserX, Users, User, 
  Clock, Plane, AlertTriangle, Settings, Palette, Send, MessageSquare, 
  FileCheck, UserPlus, UserMinus, Zap, ArrowRight, ArrowLeft, Target 
} from "lucide-react";
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

  const templateCategories = {
    "global-settings": {
      title: "Configurazione Globale",
      icon: Settings,
      description: "Impostazioni che si applicano a tutti i template email",
      color: "blue"
    },
    "admin-templates": {
      title: "Email Amministratore → Dipendente",
      icon: Send,
      description: "Template per email inviate dall'amministratore ai dipendenti",
      color: "green",
      direction: "admin-to-employee"
    },
    "employee-templates": {
      title: "Email Dipendente → Amministratore",
      icon: ArrowRight,
      description: "Template per email inviate dai dipendenti all'amministratore",
      color: "blue",
      direction: "employee-to-admin"
    },
    "system-templates": {
      title: "Template Sistema",
      icon: Zap,
      description: "Template automatici generati dal sistema",
      color: "purple",
      direction: "system"
    }
  };

  const adminTemplates = [
    { id: "documenti", name: "Documenti", icon: FileText, description: "Notifiche documenti", badge: "File" },
    { id: "notifiche", name: "Notifiche", icon: Bell, description: "Notifiche generali", badge: "Alert" },
    { id: "employee-message", name: "Messaggi", icon: MessageSquare, description: "Messaggi dipendenti", badge: "Chat" },
    { id: "permessi-richiesta", name: "Permessi", icon: Clock, description: "Richieste permessi", badge: "Richiesta" },
    { id: "ferie-richiesta", name: "Ferie", icon: Plane, description: "Richieste ferie", badge: "Richiesta" },
    { id: "permessi-approvazione", name: "Permessi OK", icon: UserCheck, description: "Approvazioni permessi", badge: "Approvato", badgeVariant: "default" },
    { id: "ferie-approvazione", name: "Ferie OK", icon: UserCheck, description: "Approvazioni ferie", badge: "Approvato", badgeVariant: "default" },
    { id: "permessi-rifiuto", name: "Permessi NO", icon: UserX, description: "Rifiuti permessi", badge: "Rifiutato", badgeVariant: "destructive" },
    { id: "ferie-rifiuto", name: "Ferie NO", icon: UserX, description: "Rifiuti ferie", badge: "Rifiutato", badgeVariant: "destructive" }
  ];

  const employeeTemplates = [
    { id: "documenti", name: "Documenti", icon: FileText, description: "Caricamento documenti", badge: "Upload" },
    { id: "notifiche", name: "Notifiche", icon: Bell, description: "Notifiche dipendenti", badge: "Alert" },
    { id: "permessi-richiesta", name: "Permessi", icon: Clock, description: "Richieste permessi", badge: "Richiesta" },
    { id: "ferie-richiesta", name: "Ferie", icon: Plane, description: "Richieste ferie", badge: "Richiesta" }
  ];

  const systemTemplates = [
    { id: "promemoria-presenza", name: "Promemoria Presenza", icon: AlertTriangle, description: "Alert entrata mancante", badge: "Auto" }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "from-blue-50 to-indigo-50 border-blue-200 text-blue-800",
      green: "from-green-50 to-emerald-50 border-green-200 text-green-800",
      purple: "from-purple-50 to-violet-50 border-purple-200 text-purple-800"
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header con descrizione migliorata */}
      <Card className={`bg-gradient-to-r ${getColorClasses("blue")} shadow-lg`}>
      <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Mail className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <span className="text-gray-900">Gestione Modelli Email</span>
              <p className="text-sm font-normal text-gray-600 mt-2">
                Personalizza tutti i template email del sistema con design, contenuti e branding personalizzati
              </p>
              <div className="flex gap-4 mt-3">
                <Badge variant="secondary" className="text-xs">
                  <Target className="w-3 h-3 mr-1" />
                  4 Categorie
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Palette className="w-3 h-3 mr-1" />
                  Personalizzazione Completa
                </Badge>
              </div>
            </div>
        </CardTitle>
      </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Navigation migliorata */}
        <TabsList className="grid w-full grid-cols-4 h-auto p-2 bg-gray-100 rounded-xl">
          {Object.entries(templateCategories).map(([key, category]) => {
            const IconComponent = category.icon;
            return (
              <TabsTrigger 
                key={key}
                value={key} 
                className="flex flex-col items-center gap-3 p-4 h-auto data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 rounded-lg transition-all duration-200"
              >
                <div className={`p-2 rounded-lg ${key === activeTab ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <IconComponent className={`w-5 h-5 ${key === activeTab ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium block">{category.title.split(' ')[0]}</span>
                  <span className="text-xs text-gray-500 block">{category.title.split(' ').slice(1).join(' ')}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {category.direction === 'admin-to-employee' && 'Admin→Emp'}
                  {category.direction === 'employee-to-admin' && 'Emp→Admin'}
                  {category.direction === 'system' && 'Sistema'}
                  {!category.direction && 'Globale'}
                </Badge>
            </TabsTrigger>
            );
          })}
          </TabsList>

        {/* Configurazione Globale */}
        <TabsContent value="global-settings" className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Settings className="w-6 h-6" />
                Configurazione Globale
              </CardTitle>
              <p className="text-sm text-blue-700">
                Impostazioni che si applicano a tutti i template email del sistema
              </p>
            </CardHeader>
            <CardContent className="p-6">
            <GlobalLogoSection />
            </CardContent>
          </Card>
          </TabsContent>

        {/* Template Amministratore */}
        <TabsContent value="admin-templates" className="space-y-6">
          <Card className={`border-green-200 bg-gradient-to-r ${getColorClasses("green")} shadow-lg`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-6 h-6" />
                Template Email Amministratore → Dipendente
              </CardTitle>
              <p className="text-sm text-green-700">
                Questi template vengono utilizzati quando l'amministratore invia email ai dipendenti
              </p>
            </CardHeader>
          </Card>

          <Tabs value={activeAdminSubTab} onValueChange={setActiveAdminSubTab} className="space-y-4">
            <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 h-auto p-2 bg-transparent">
              {adminTemplates.map((template) => {
                const IconComponent = template.icon;
                return (
                  <TabsTrigger 
                    key={template.id}
                    value={template.id} 
                    className="flex flex-col items-center gap-3 p-4 h-auto data-[state=active]:bg-green-100 data-[state=active]:border-green-300 data-[state=active]:shadow-md rounded-xl border-2 border-transparent transition-all duration-200 hover:border-green-200"
                  >
                    <div className={`p-3 rounded-xl ${activeAdminSubTab === template.id ? 'bg-green-200' : 'bg-gray-100'}`}>
                      <IconComponent className={`w-6 h-6 ${activeAdminSubTab === template.id ? 'text-green-700' : 'text-gray-600'}`} />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-medium block">{template.name}</span>
                      <span className="text-xs text-gray-500">{template.description}</span>
            </div>
                    <Badge 
                      variant={template.badgeVariant as any || "outline"} 
                      className="text-xs"
                    >
                      {template.badge}
                    </Badge>
                </TabsTrigger>
                );
              })}
              </TabsList>

            {/* Contenuto dei template amministratore */}
            {adminTemplates.map((template) => (
              <TabsContent key={template.id} value={template.id} className="mt-6">
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                    <CardTitle className="flex items-center gap-2">
                      <template.icon className="w-5 h-5" />
                      Template {template.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Personalizza il template per le email {template.description}
                    </p>
                  </CardHeader>
                  <CardContent className="p-6">
                    {template.id === "documenti" && (
                <DocumentTemplateEditor 
                  templateType="documenti" 
                  templateCategory="amministratori"
                        defaultContent=""
                        defaultSubject=""
                  subjectEditable={true}
                  contentEditable={true}
                />
                    )}
                    {template.id === "notifiche" && (
                <NotificationTemplateEditor 
                        templateType="notifiche" 
                        templateCategory="amministratori"
                        defaultContent=""
                        defaultSubject=""
                        subjectEditable={true}
                        contentEditable={true}
                      />
                    )}
                    {template.id === "employee-message" && (
                      <EmailTemplateEditor
                        templateType="employee-message"
                        templateCategory="amministratori"
                        defaultSubject=""
                        defaultContent=""
                        subjectEditable={true}
                        contentEditable={true}
                      />
                    )}
                    {template.id === "permessi-richiesta" && (
                      <PermissionRequestTemplateEditor 
                  templateCategory="amministratori"
                        defaultContent=""
                        defaultSubject=""
                  subjectEditable={true}
                  contentEditable={true}
                />
                    )}
                    {template.id === "ferie-richiesta" && (
                      <VacationRequestTemplateEditor 
                  templateCategory="amministratori"
                        defaultContent=""
                        defaultSubject=""
                        subjectEditable={true}
                        contentEditable={true}
                      />
                    )}
                    {template.id === "permessi-approvazione" && (
                      <PermissionApprovalTemplateEditor 
                        templateCategory="dipendenti"
                        defaultContent=""
                        defaultSubject=""
                        subjectEditable={true}
                        contentEditable={true}
                      />
                    )}
                    {template.id === "ferie-approvazione" && (
                      <VacationApprovalTemplateEditor 
                        templateCategory="dipendenti"
                        defaultContent=""
                        defaultSubject=""
                        subjectEditable={true}
                        contentEditable={true}
                      />
                    )}
                    {template.id === "permessi-rifiuto" && (
                      <PermissionRejectionTemplateEditor 
                        templateCategory="dipendenti"
                        defaultContent=""
                        defaultSubject=""
                        subjectEditable={true}
                        contentEditable={true}
                      />
                    )}
                    {template.id === "ferie-rifiuto" && (
                      <VacationRejectionTemplateEditor 
                        templateCategory="dipendenti"
                        defaultContent=""
                        defaultSubject=""
                  subjectEditable={true}
                  contentEditable={true}
                />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
            </Tabs>
          </TabsContent>

        {/* Template Dipendente */}
        <TabsContent value="employee-templates" className="space-y-6">
          <Card className={`border-blue-200 bg-gradient-to-r ${getColorClasses("blue")} shadow-lg`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-6 h-6" />
                Template Email Dipendente → Amministratore
              </CardTitle>
              <p className="text-sm text-blue-700">
                Questi template vengono utilizzati quando i dipendenti inviano email all'amministratore
              </p>
            </CardHeader>
          </Card>

          <Tabs value={activeEmployeeSubTab} onValueChange={setActiveEmployeeSubTab} className="space-y-4">
            <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 h-auto p-2 bg-transparent">
              {employeeTemplates.map((template) => {
                const IconComponent = template.icon;
                return (
                  <TabsTrigger 
                    key={template.id}
                    value={template.id} 
                    className="flex flex-col items-center gap-3 p-4 h-auto data-[state=active]:bg-blue-100 data-[state=active]:border-blue-300 data-[state=active]:shadow-md rounded-xl border-2 border-transparent transition-all duration-200 hover:border-blue-200"
                  >
                    <div className={`p-3 rounded-xl ${activeEmployeeSubTab === template.id ? 'bg-blue-200' : 'bg-gray-100'}`}>
                      <IconComponent className={`w-6 h-6 ${activeEmployeeSubTab === template.id ? 'text-blue-700' : 'text-gray-600'}`} />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-medium block">{template.name}</span>
                      <span className="text-xs text-gray-500">{template.description}</span>
            </div>
                    <Badge variant="outline" className="text-xs">
                      {template.badge}
                    </Badge>
                </TabsTrigger>
                );
              })}
              </TabsList>

            {/* Contenuto dei template dipendente */}
            {employeeTemplates.map((template) => (
              <TabsContent key={template.id} value={template.id} className="mt-6">
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardTitle className="flex items-center gap-2">
                      <template.icon className="w-5 h-5" />
                      Template {template.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Personalizza il template per le email {template.description}
                    </p>
                  </CardHeader>
                  <CardContent className="p-6">
                    {template.id === "documenti" && (
                <DocumentTemplateEditor 
                  templateType="documenti" 
                  templateCategory="dipendenti"
                        defaultContent=""
                        defaultSubject=""
                  subjectEditable={true}
                  contentEditable={true}
                />
                    )}
                    {template.id === "notifiche" && (
                <NotificationTemplateEditor 
                        templateType="notifiche" 
                        templateCategory="dipendenti"
                        defaultContent=""
                        defaultSubject=""
                        subjectEditable={true}
                        contentEditable={true}
                      />
                    )}
                    {template.id === "permessi-richiesta" && (
                      <PermissionRequestTemplateEditor 
                        templateCategory="dipendenti"
                        defaultContent=""
                        defaultSubject=""
                        subjectEditable={true}
                        contentEditable={true}
                      />
                    )}
                    {template.id === "ferie-richiesta" && (
                      <VacationRequestTemplateEditor 
                  templateCategory="dipendenti"
                        defaultContent=""
                        defaultSubject=""
                  subjectEditable={true}
                  contentEditable={true}
                />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
              </TabsContent>

        {/* Template Sistema */}
        <TabsContent value="system-templates" className="space-y-6">
          <Card className={`border-purple-200 bg-gradient-to-r ${getColorClasses("purple")} shadow-lg`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-6 h-6" />
                Template Sistema Automatici
              </CardTitle>
              <p className="text-sm text-purple-700">
                Template generati automaticamente dal sistema per notifiche e promemoria
              </p>
            </CardHeader>
          </Card>

          <div className="max-w-4xl mx-auto">
            {systemTemplates.map((template) => {
              const IconComponent = template.icon;
              return (
                <Card key={template.id} className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
                    <CardTitle className="flex items-center gap-2">
                      <IconComponent className="w-5 h-5" />
                      {template.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      {template.description}
                    </p>
                  </CardHeader>
                  <CardContent className="p-6">
                    <AttendanceAlertTemplateEditor
                      templateCategory="amministratori"
                      defaultContent=""
                      defaultSubject=""
                      subjectEditable={true}
                      contentEditable={true}
                    />
                  </CardContent>
                </Card>
              );
            })}
                </div>
              </TabsContent>
            </Tabs>
    </div>
  );
};

export default EmailTemplateManager;
