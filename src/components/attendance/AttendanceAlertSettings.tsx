import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Clock } from 'lucide-react';
import { useAttendanceAlertSettings } from '@/hooks/useAttendanceAlertSettings';

export default function AttendanceAlertSettings() {
  const { settings, updateSettings, isUpdating } = useAttendanceAlertSettings();
  const [formData, setFormData] = useState({
    attendance_alert_enabled: false,
    attendance_alert_delay_minutes: 30,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        attendance_alert_enabled: settings.attendance_alert_enabled ?? false,
        attendance_alert_delay_minutes: settings.attendance_alert_delay_minutes ?? 30,
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Controllo Entrate Automatico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Abilita Controllo Automatico</Label>
              <div className="text-sm text-muted-foreground">
                Invia email automatiche ai dipendenti che non registrano l'entrata
              </div>
            </div>
            <Switch
              checked={formData.attendance_alert_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, attendance_alert_enabled: checked }))}
            />
          </div>

          {formData.attendance_alert_enabled && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <Label htmlFor="delay">Tempo di attesa (minuti)</Label>
                </div>
                <Input
                  id="delay"
                  type="number"
                  min="5"
                  max="240"
                  value={formData.attendance_alert_delay_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, attendance_alert_delay_minutes: parseInt(e.target.value) }))}
                />
                <div className="text-sm text-muted-foreground">
                  Tempo da aspettare dopo l'orario previsto prima di inviare l'avviso
                </div>
              </div>


              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Come Funziona</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Il sistema controlla ogni 15 minuti se ci sono dipendenti che non hanno registrato l'entrata</li>
                  <li>• L'avviso viene inviato solo nei giorni lavorativi</li>
                  <li>• Considera gli orari personalizzati di ogni dipendente</li>
                  <li>• Non invia avvisi se il dipendente è in ferie o permesso</li>
                  <li>• Il template email è personalizzabile nella sezione "Gestione Modelli Email"</li>
                </ul>
              </div>
            </>
          )}

          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? 'Salvando...' : 'Salva Impostazioni'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
