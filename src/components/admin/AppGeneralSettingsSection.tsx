import { useState } from "react";
import { useAppGeneralSettings } from "@/hooks/useAppGeneralSettings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Globe, Save } from "lucide-react";

const AppGeneralSettingsSection = () => {
  const { settings, setSettings, loading, saveSettings } = useAppGeneralSettings();

  const handleSave = () => {
    saveSettings(settings);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Globe className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold">Impostazioni Generali Applicazione</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Personalizzazione Titolo e Descrizione
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="app-title" className="text-base font-medium">
                Titolo Applicazione (Tab Browser)
              </Label>
              <p className="text-sm text-gray-600 mb-2">
                Questo titolo apparirà nella tab del browser e nei risultati di ricerca
              </p>
              <Input
                id="app-title"
                type="text"
                placeholder="Es: SerramentiCorp - Gestione Aziendale"
                value={settings.app_title}
                onChange={(e) => setSettings(prev => ({ ...prev, app_title: e.target.value }))}
                className="text-base"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lunghezza consigliata: 50-60 caratteri
              </p>
            </div>

            <Separator />

            <div>
              <Label htmlFor="app-description" className="text-base font-medium">
                Descrizione Applicazione
              </Label>
              <p className="text-sm text-gray-600 mb-2">
                Descrizione che apparirà nei risultati di ricerca e nei meta tag
              </p>
              <Textarea
                id="app-description"
                placeholder="Es: Sistema completo di gestione aziendale per imprese di serramenti"
                value={settings.app_description}
                onChange={(e) => setSettings(prev => ({ ...prev, app_description: e.target.value }))}
                rows={3}
                className="text-base"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lunghezza consigliata: 150-160 caratteri
              </p>
            </div>
          </div>

          <Separator />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Anteprima</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-blue-800">Tab Browser:</span>
                <div className="bg-white border rounded px-3 py-2 mt-1 font-mono text-blue-900">
                  {settings.app_title || "Titolo non impostato"}
                </div>
              </div>
              <div>
                <span className="font-medium text-blue-800">Descrizione:</span>
                <div className="bg-white border rounded px-3 py-2 mt-1 text-blue-900">
                  {settings.app_description || "Descrizione non impostata"}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSave}
              disabled={loading || !settings.app_title.trim()}
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Save className="w-4 h-4 mr-2 animate-pulse" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salva Impostazioni
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppGeneralSettingsSection;
