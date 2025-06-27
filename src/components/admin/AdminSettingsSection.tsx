
import { useState, useEffect } from "react";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import DashboardCustomizationSection from "./DashboardCustomizationSection";
import LoginCustomizationSection from "./LoginCustomizationSection";
import EmployeeLogosSection from "./EmployeeLogosSection";
import EmailTemplateManager from "./EmailTemplateManager";
import AttendanceSettings from "@/components/attendance/AttendanceSettings";
import WorkScheduleSettings from "./WorkScheduleSettings";

const AdminSettingsSection = () => {
  const { brevoSettings, setBrevoSettings, loading, saveBrevoSettings } = useAdminSettings();

  const handleSaveBrevoSettings = () => {
    saveBrevoSettings(brevoSettings);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-6">Impostazioni Amministratore</h1>
      <Tabs defaultValue="brevo" className="w-full">
        <TabsList className="flex flex-wrap justify-start gap-1 mb-6 h-auto bg-gray-100 p-1 rounded-lg w-full">
          <TabsTrigger 
            value="brevo" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 py-2 whitespace-nowrap flex-shrink-0"
          >
            Configurazione Brevo
          </TabsTrigger>
          <TabsTrigger 
            value="emailtemplates" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 py-2 whitespace-nowrap flex-shrink-0"
          >
            Modelli Email
          </TabsTrigger>
          <TabsTrigger 
            value="attendances" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 py-2 whitespace-nowrap flex-shrink-0"
          >
            Presenze
          </TabsTrigger>
          <TabsTrigger 
            value="work-schedules" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 py-2 whitespace-nowrap flex-shrink-0"
          >
            Orari di Lavoro
          </TabsTrigger>
          <TabsTrigger 
            value="dashboard" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 py-2 whitespace-nowrap flex-shrink-0"
          >
            Dashboard
          </TabsTrigger>
          <TabsTrigger 
            value="login" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 py-2 whitespace-nowrap flex-shrink-0"
          >
            Login
          </TabsTrigger>
          <TabsTrigger 
            value="employeelogos" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 py-2 whitespace-nowrap flex-shrink-0"
          >
            Loghi Dipendenti
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brevo" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Configurazione Email - Brevo</h2>
            <p className="text-sm text-gray-600 mb-6">
              Configura le impostazioni base per l'invio di email tramite l'API Brevo
            </p>
          </div>

          {/* Configurazione Base - Centrato */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-lg">Configurazione Base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="api-key">Chiave API Brevo *</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Incolla la tua chiave API Brevo"
                    value={brevoSettings.apiKey}
                    onChange={e => setBrevoSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    <a className="underline" href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noopener noreferrer">
                      Genera una nuova chiave su brevo.com
                    </a>
                  </p>
                </div>

                <div>
                  <Label htmlFor="sender-name">Nome Mittente</Label>
                  <Input
                    id="sender-name"
                    placeholder="es. La Tua Azienda"
                    value={brevoSettings.senderName}
                    onChange={e => setBrevoSettings(prev => ({ ...prev, senderName: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="sender-email">Email Mittente</Label>
                  <Input
                    id="sender-email"
                    type="email"
                    placeholder="noreply@tuaazienda.com"
                    value={brevoSettings.senderEmail}
                    onChange={e => setBrevoSettings(prev => ({ ...prev, senderEmail: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="reply-to">Email di Risposta</Label>
                  <Input
                    id="reply-to"
                    type="email"
                    placeholder="info@tuaazienda.com"
                    value={brevoSettings.replyTo}
                    onChange={e => setBrevoSettings(prev => ({ ...prev, replyTo: e.target.value }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label htmlFor="hide-history" className="text-sm font-medium">
                    Nascondi storico presenze ai dipendenti
                  </Label>
                  <Switch
                    id="hide-history"
                    checked={brevoSettings.hideAttendanceHistoryForEmployees}
                    onCheckedChange={(checked) => 
                      setBrevoSettings(prev => ({ 
                        ...prev, 
                        hideAttendanceHistoryForEmployees: checked 
                      }))
                    }
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Se attivato, i dipendenti non potranno vedere lo storico delle proprie presenze
                </p>

                <div className="pt-4">
                  <Button
                    onClick={handleSaveBrevoSettings}
                    disabled={loading || !brevoSettings.apiKey}
                    size="lg"
                    className="w-full"
                  >
                    {loading ? 'Salvataggio...' : 'Salva Configurazione'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="emailtemplates">
          <EmailTemplateManager />
        </TabsContent>
        <TabsContent value="attendances">
          <AttendanceSettings />
        </TabsContent>
        <TabsContent value="work-schedules">
          <WorkScheduleSettings />
        </TabsContent>
        <TabsContent value="dashboard">
          <DashboardCustomizationSection />
        </TabsContent>
        <TabsContent value="login">
          <LoginCustomizationSection />
        </TabsContent>
        <TabsContent value="employeelogos">
          <EmployeeLogosSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettingsSection;
