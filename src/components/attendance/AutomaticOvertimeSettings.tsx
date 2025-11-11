import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, AlertCircle } from 'lucide-react';
import { useAutomaticOvertimeSettings } from '@/hooks/useAutomaticOvertimeSettings';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AutomaticOvertimeSettings() {
  const { settings, updateSettings, isUpdating, isLoading } = useAutomaticOvertimeSettings();
  const [formData, setFormData] = useState({
    enable_auto_overtime_checkin: false,
    auto_overtime_tolerance_minutes: 15,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        enable_auto_overtime_checkin: settings.enable_auto_overtime_checkin ?? false,
        auto_overtime_tolerance_minutes: settings.auto_overtime_tolerance_minutes ?? 15,
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Straordinari Automatici (Check-in)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            Caricamento impostazioni...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Straordinari Automatici (Check-in)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Quando attivato, il sistema registra automaticamente gli straordinari quando un dipendente 
              timbra prima dell'orario di inizio turno previsto.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Abilita Rilevamento Automatico</Label>
              <div className="text-sm text-muted-foreground">
                Registra automaticamente straordinari per check-in anticipati
              </div>
            </div>
            <Switch
              checked={formData.enable_auto_overtime_checkin}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, enable_auto_overtime_checkin: checked }))
              }
            />
          </div>

          {formData.enable_auto_overtime_checkin && (
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="tolerance">Tolleranza (minuti)</Label>
              <Input
                id="tolerance"
                type="number"
                min="0"
                max="60"
                value={formData.auto_overtime_tolerance_minutes}
                onChange={(e) => 
                  setFormData(prev => ({ 
                    ...prev, 
                    auto_overtime_tolerance_minutes: parseInt(e.target.value) || 0 
                  }))
                }
              />
              <div className="text-sm text-muted-foreground">
                Se il dipendente timbra entro questa tolleranza rispetto all'orario previsto, 
                non viene calcolato straordinario.
                <div className="mt-2 p-2 bg-muted rounded-md">
                  <strong>Esempio:</strong> Con tolleranza di {formData.auto_overtime_tolerance_minutes} minuti 
                  e orario di inizio alle 09:00:
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Check-in alle 08:50 → Nessuno straordinario</li>
                    <li>Check-in alle 08:30 → Straordinario di 30 minuti</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button type="submit" disabled={isUpdating} className="w-full">
              {isUpdating ? 'Salvando...' : 'Salva Impostazioni'}
            </Button>
          </div>

          {formData.enable_auto_overtime_checkin && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Nota importante:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Gli straordinari automatici vengono creati con stato "Da approvare"</li>
                  <li>Se esiste uno straordinario automatico per una data, non è possibile inserirne uno manuale</li>
                  <li>Per inserire uno straordinario manuale, elimina prima quello automatico</li>
                  <li>Il calcolo si basa sul turno lavorativo assegnato al dipendente</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

