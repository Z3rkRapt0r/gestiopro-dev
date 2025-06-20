
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, MapPin, Clock } from 'lucide-react';
import { useAdminAttendanceSettings } from '@/hooks/useAdminAttendanceSettings';
import GPSStatusIndicator from './GPSStatusIndicator';

export default function AttendanceSettings() {
  const { settings, updateSettings, isUpdating } = useAdminAttendanceSettings();
  const [formData, setFormData] = useState({
    checkout_enabled: true,
    company_latitude: '',
    company_longitude: '',
    attendance_radius_meters: 500,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        checkout_enabled: settings.checkout_enabled ?? true,
        company_latitude: settings.company_latitude?.toString() ?? '',
        company_longitude: settings.company_longitude?.toString() ?? '',
        attendance_radius_meters: settings.attendance_radius_meters ?? 500,
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      checkout_enabled: formData.checkout_enabled,
      company_latitude: formData.company_latitude ? parseFloat(formData.company_latitude) : null,
      company_longitude: formData.company_longitude ? parseFloat(formData.company_longitude) : null,
      attendance_radius_meters: formData.attendance_radius_meters,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Impostazioni Presenze
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Abilita Check-out</Label>
                <div className="text-sm text-muted-foreground">
                  Permetti ai dipendenti di registrare l'uscita
                </div>
              </div>
              <Switch
                checked={formData.checkout_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, checkout_enabled: checked }))}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <Label className="text-base">Posizione Azienda</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitudine</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="es. 45.4642"
                    value={formData.company_latitude}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_latitude: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitudine</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="es. 9.1900"
                    value={formData.company_longitude}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_longitude: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="radius">Raggio consentito (metri)</Label>
              <Input
                id="radius"
                type="number"
                min="50"
                max="2000"
                value={formData.attendance_radius_meters}
                onChange={(e) => setFormData(prev => ({ ...prev, attendance_radius_meters: parseInt(e.target.value) }))}
              />
              <div className="text-sm text-muted-foreground">
                Distanza massima consentita dalle coordinate aziendali
              </div>
            </div>

            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Salvando...' : 'Salva Impostazioni'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <GPSStatusIndicator />
    </div>
  );
}
