import { useState } from "react";
import { useAppGeneralSettings } from "@/hooks/useAppGeneralSettings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Globe, Save, Clock } from "lucide-react";

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

      {/* Sezione per le impostazioni dei permessi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Limiti Permessi Dipendenti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="max-permission-hours" className="text-base font-medium">
                Ore Massime per Permesso
              </Label>
              <p className="text-sm text-gray-600 mb-2">
                Numero massimo di ore che un dipendente può richiedere per un singolo permesso
              </p>
              <div className="flex items-center gap-2">
                <Input
                  id="max-permission-hours"
                  type="number"
                  min="1"
                  max="24"
                  placeholder="8"
                  value={settings.max_permission_hours}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    max_permission_hours: parseInt(e.target.value) || 8 
                  }))}
                  className="text-base w-24"
                />
                <span className="text-sm text-gray-600">ore</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Valore compreso tra 1 e 24 ore
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-900 mb-2">Informazioni</h4>
            <div className="text-sm text-amber-800">
              <p>• Questa impostazione si applica solo alle richieste di permesso dei dipendenti</p>
              <p>• I dipendenti non potranno richiedere permessi superiori a {settings.max_permission_hours} ore</p>
              <p>• Le richieste che superano questo limite verranno automaticamente rifiutate</p>
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
