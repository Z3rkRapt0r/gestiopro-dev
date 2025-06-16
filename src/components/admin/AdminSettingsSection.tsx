
import { useState, useEffect } from "react";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlobalEmailTemplateSection from "./GlobalEmailTemplateSection";
import DashboardCustomizationSection from "./DashboardCustomizationSection";

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
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-6">Impostazioni Amministratore</h1>
      <Tabs defaultValue="brevo" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="brevo">Configurazione Brevo</TabsTrigger>
          <TabsTrigger value="emailtemplate">Modello Globale Email</TabsTrigger>
          <TabsTrigger value="dashboard">Personalizzazione Dashboard</TabsTrigger>
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
        <TabsContent value="dashboard">
          <DashboardCustomizationSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default AdminSettingsSection;
