
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAttendanceSettings } from '@/hooks/useAttendanceSettings';

export default function GPSStatusIndicator() {
  const { settings, isLoading } = useAttendanceSettings();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Stato GPS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Caricamento...</div>
        </CardContent>
      </Card>
    );
  }

  const hasCoordinates = settings?.company_latitude && settings?.company_longitude;
  const radius = settings?.attendance_radius_meters || 500;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Stato Controllo GPS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Coordinate Azienda:</span>
          {hasCoordinates ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Configurate
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Non configurate
            </Badge>
          )}
        </div>

        {hasCoordinates && (
          <>
            <div className="text-xs text-muted-foreground">
              Lat: {settings.company_latitude}, Lng: {settings.company_longitude}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Raggio Consentito:</span>
              <Badge variant="outline">{radius}m</Badge>
            </div>
          </>
        )}

        {!hasCoordinates && (
          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
            ⚠️ Senza coordinate aziendali, i dipendenti possono registrare presenze da qualsiasi posizione.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
