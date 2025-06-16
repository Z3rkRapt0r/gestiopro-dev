import { useState, useEffect } from "react";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlobalEmailTemplateSection from "./GlobalEmailTemplateSection";
import DashboardCustomizationSection from "./DashboardCustomizationSection";
import LoginCustomizationSection from "./LoginCustomizationSection";
import EmployeeLogosSection from "./EmployeeLogosSection";
import EmailTemplateManager from "./EmailTemplateManager";

const AdminSettingsSection = () => {
  const { apiKey, loading, saveApiKey } = useAdminSettings();
  const [value, setValue] = useState(apiKey || "");

  // Aggiorna value quando apiKey cambia
  useEffect(() => {
    if (apiKey !== null && apiKey !== undefined) {
      setValue(apiKey);
    }
  }, [apiKey]);

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
            value="emailtemplate" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 py-2 whitespace-nowrap flex-shrink-0"
          >
            Modello Email Globale
          </TabsTrigger>
          <TabsTrigger 
            value="emailtemplates" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-3 py-2 whitespace-nowrap flex-shrink-0"
          >
            Modelli Email Avanzati
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
        <TabsContent value="brevo" className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Impostazioni Invio Notifiche - Brevo</h2>
          <Input
            type="password"
            placeholder="Incolla la tua chiave API Brevo"
            value={value}
            onChange={e => setValue(e.target.value)}
            disabled={loading}
          />
          <Button
            onClick={() => saveApiKey(value)}
            disabled={loading || !value}
          >
            Salva chiave API
          </Button>
          <div className="text-xs text-gray-500 mt-2">
            Puoi generare una nuova chiave su <a className="underline" href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noopener noreferrer">brevo.com</a> <br />
            Questa chiave viene salvata solo per il tuo profilo admin.
          </div>
        </TabsContent>
        <TabsContent value="emailtemplate">
          <GlobalEmailTemplateSection />
        </TabsContent>
        <TabsContent value="emailtemplates">
          <EmailTemplateManager />
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
