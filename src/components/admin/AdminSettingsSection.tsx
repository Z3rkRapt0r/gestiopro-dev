
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
              Configura tutte le impostazioni per l'invio e la ricezione di email tramite l'API Brevo
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configurazione Base */}
            <Card>
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
              </CardContent>
            </Card>

            {/* Impostazioni Notifiche */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notifiche Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enable-notifications">Abilita Notifiche</Label>
                    <p className="text-xs text-gray-500">Invio generale di notifiche email</p>
                  </div>
                  <Switch
                    id="enable-notifications"
                    checked={brevoSettings.enableNotifications}
                    onCheckedChange={checked => setBrevoSettings(prev => ({ ...prev, enableNotifications: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifiche Documenti</Label>
                    <p className="text-xs text-gray-500">Email per caricamento documenti</p>
                  </div>
                  <Switch
                    checked={brevoSettings.enableDocumentNotifications}
                    onCheckedChange={checked => setBrevoSettings(prev => ({ ...prev, enableDocumentNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifiche Presenze</Label>
                    <p className="text-xs text-gray-500">Email per registrazione presenze</p>
                  </div>
                  <Switch
                    checked={brevoSettings.enableAttendanceNotifications}
                    onCheckedChange={checked => setBrevoSettings(prev => ({ ...prev, enableAttendanceNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifiche Permessi</Label>
                    <p className="text-xs text-gray-500">Email per richieste permessi/ferie</p>
                  </div>
                  <Switch
                    checked={brevoSettings.enableLeaveNotifications}
                    onCheckedChange={checked => setBrevoSettings(prev => ({ ...prev, enableLeaveNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email di Benvenuto</Label>
                    <p className="text-xs text-gray-500">Email per nuovi dipendenti</p>
                  </div>
                  <Switch
                    checked={brevoSettings.enableWelcomeEmails}
                    onCheckedChange={checked => setBrevoSettings(prev => ({ ...prev, enableWelcomeEmails: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personalizzazione Email */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personalizzazione</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email-signature">Firma Email</Label>
                  <Textarea
                    id="email-signature"
                    placeholder="Inserisci la firma standard per le email..."
                    rows={4}
                    value={brevoSettings.emailSignature}
                    onChange={e => setBrevoSettings(prev => ({ ...prev, emailSignature: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Questa firma verrà aggiunta automaticamente a tutte le email
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Impostazioni Avanzate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Impostazioni Avanzate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tracciamento Aperture</Label>
                    <p className="text-xs text-gray-500">Monitora quando le email vengono aperte</p>
                  </div>
                  <Switch
                    checked={brevoSettings.trackOpens}
                    onCheckedChange={checked => setBrevoSettings(prev => ({ ...prev, trackOpens: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tracciamento Click</Label>
                    <p className="text-xs text-gray-500">Monitora i click sui link nelle email</p>
                  </div>
                  <Switch
                    checked={brevoSettings.trackClicks}
                    onCheckedChange={checked => setBrevoSettings(prev => ({ ...prev, trackClicks: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Riprova Automatica</Label>
                    <p className="text-xs text-gray-500">Riprova invio email fallite</p>
                  </div>
                  <Switch
                    checked={brevoSettings.autoRetry}
                    onCheckedChange={checked => setBrevoSettings(prev => ({ ...prev, autoRetry: checked }))}
                  />
                </div>

                <div>
                  <Label htmlFor="max-retries">Tentativi Massimi</Label>
                  <Input
                    id="max-retries"
                    type="number"
                    min="1"
                    max="10"
                    value={brevoSettings.maxRetries}
                    onChange={e => setBrevoSettings(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 3 }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveBrevoSettings}
              disabled={loading || !brevoSettings.apiKey}
              size="lg"
            >
              {loading ? 'Salvataggio...' : 'Salva Configurazione'}
            </Button>
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
