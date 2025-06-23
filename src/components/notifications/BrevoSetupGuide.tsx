
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Mail, Settings } from "lucide-react";
import { useAdminSettings } from "@/hooks/useAdminSettings";

const BrevoSetupGuide = () => {
  const { apiKey, loading, saveApiKey } = useAdminSettings();
  const [tempApiKey, setTempApiKey] = useState("");

  const handleSaveKey = () => {
    if (tempApiKey.trim()) {
      saveApiKey(tempApiKey.trim());
      setTempApiKey("");
    }
  };

  if (apiKey) {
    return (
      <Alert className="mb-4 border-green-200 bg-green-50">
        <Mail className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          Brevo è configurato correttamente. Puoi inviare notifiche email ai tuoi dipendenti.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Settings className="w-5 h-5" />
          Configurazione Brevo richiesta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Per inviare email ai dipendenti, devi configurare la tua chiave API di Brevo.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-3">
          <div>
            <Label htmlFor="brevo-key">Chiave API Brevo</Label>
            <Input
              id="brevo-key"
              type="password"
              placeholder="Inserisci la tua chiave API Brevo"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleSaveKey}
              disabled={loading || !tempApiKey.trim()}
              size="sm"
            >
              {loading ? "Salvataggio..." : "Salva chiave"}
            </Button>
            
            <Button variant="outline" size="sm" asChild>
              <a 
                href="https://app.brevo.com/settings/keys/api" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Ottieni chiave API
              </a>
            </Button>
          </div>
        </div>

        <div className="text-sm text-gray-600 bg-white p-3 rounded border">
          <strong>Come ottenere la chiave API:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Vai su <a href="https://app.brevo.com" target="_blank" className="text-blue-600 underline">app.brevo.com</a></li>
            <li>Accedi al tuo account (crea un account gratuito se necessario)</li>
            <li>Vai in Impostazioni → API Keys</li>
            <li>Crea una nuova chiave API</li>
            <li>Copia e incolla la chiave qui sopra</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default BrevoSetupGuide;
