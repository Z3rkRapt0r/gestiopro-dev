
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin, Play, Square, Plane, AlertTriangle } from 'lucide-react';
import { useAttendances } from '@/hooks/useAttendances';
import { useBusinessTrips } from '@/hooks/useBusinessTrips';
import { useGPSValidation } from '@/hooks/useGPSValidation';

export default function AttendanceCheckInOut() {
  const { checkIn, checkOut, isCheckingIn, isCheckingOut, getTodayAttendance } = useAttendances();
  const { businessTrips } = useBusinessTrips();
  const { validateLocation, settings: adminSettings } = useGPSValidation();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedBusinessTrip, setSelectedBusinessTrip] = useState<string | null>(null);

  const todayAttendance = getTodayAttendance();
  const today = new Date().toISOString().split('T')[0];

  // Ottieni le trasferte approvate che includono la data di oggi
  const approvedTripsToday = businessTrips?.filter(trip => 
    trip.status === 'approved' && 
    trip.start_date <= today && 
    trip.end_date >= today
  ) || [];

  useEffect(() => {
    console.log('Richiesta geolocalizzazione...');
    // Richiedi la geolocalizzazione
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          console.log('Posizione rilevata:', newLocation);
          setLocation(newLocation);
          setLocationError(null);
        },
        (error) => {
          console.error('Errore geolocalizzazione:', error);
          setLocationError('Geolocalizzazione non disponibile. Abilita la posizione nel browser.');
        }
      );
    } else {
      setLocationError('Geolocalizzazione non supportata dal browser.');
    }
  }, []);

  const handleCheckIn = () => {
    if (!location) {
      setLocationError('Posizione non disponibile. Ricarica la pagina e consenti l\'accesso alla posizione.');
      return;
    }

    console.log('Tentativo check-in con:', {
      location,
      selectedBusinessTrip,
      adminSettings
    });

    const isBusinessTrip = !!selectedBusinessTrip;
    checkIn({
      ...location,
      isBusinessTrip,
      businessTripId: selectedBusinessTrip || undefined,
    });
  };

  const handleCheckOut = () => {
    if (!location) {
      setLocationError('Posizione non disponibile. Ricarica la pagina e consenti l\'accesso alla posizione.');
      return;
    }
    checkOut(location);
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calcola se siamo nel raggio consentito
  const getLocationStatus = () => {
    if (!location) return { inRange: true, distance: null };
    
    const validation = validateLocation(location.latitude, location.longitude, !!selectedBusinessTrip);
    return {
      inRange: validation.isValid,
      distance: validation.distance,
      message: validation.message
    };
  };

  const locationStatus = getLocationStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Presenza di Oggi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {locationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {locationError}
          </div>
        )}

        {location && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              Posizione rilevata: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </div>
            
            {adminSettings?.company_latitude && adminSettings?.company_longitude && (
              <div className="flex items-center gap-2 text-sm">
                {locationStatus.inRange ? (
                  <Badge variant="default" className="bg-green-600">
                    <MapPin className="w-3 h-3 mr-1" />
                    Posizione valida
                    {locationStatus.distance && ` (${locationStatus.distance}m)`}
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Fuori dal raggio consentito
                    {locationStatus.distance && ` (${locationStatus.distance}m)`}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Selezione trasferta se ce ne sono di approvate */}
        {approvedTripsToday.length > 0 && !todayAttendance?.check_in_time && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Sei in trasferta oggi?</label>
            <Select value={selectedBusinessTrip || 'none'} onValueChange={(value) => setSelectedBusinessTrip(value === 'none' ? null : value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No, presenza normale</SelectItem>
                {approvedTripsToday.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    <div className="flex items-center gap-2">
                      <Plane className="w-3 h-3" />
                      {trip.destination}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {todayAttendance && (
          <div className="space-y-2">
            {todayAttendance.check_in_time && (
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span className="text-sm">Check-in:</span>
                <Badge variant="outline" className="bg-green-100 text-green-700">
                  {formatTime(todayAttendance.check_in_time)}
                </Badge>
              </div>
            )}
            
            {todayAttendance.check_out_time && (
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                <span className="text-sm">Check-out:</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-700">
                  {formatTime(todayAttendance.check_out_time)}
                </Badge>
              </div>
            )}

            {todayAttendance.is_business_trip && (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                <Plane className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">Presenza in trasferta</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {!todayAttendance?.check_in_time ? (
            <Button
              onClick={handleCheckIn}
              disabled={!location || isCheckingIn || (!locationStatus.inRange && !selectedBusinessTrip)}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              {isCheckingIn ? 'Registrando...' : 'Inizio Turno'}
            </Button>
          ) : !todayAttendance.check_out_time && adminSettings?.checkout_enabled ? (
            <Button
              onClick={handleCheckOut}
              disabled={!location || isCheckingOut}
              variant="destructive"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              {isCheckingOut ? 'Registrando...' : 'Fine Turno'}
            </Button>
          ) : (
            <div className="flex-1 p-2 bg-gray-50 rounded text-center text-sm text-muted-foreground">
              {!adminSettings?.checkout_enabled && todayAttendance.check_in_time && !todayAttendance.check_out_time
                ? 'Check-out disabilitato'
                : 'Turno completato per oggi'
              }
            </div>
          )}
        </div>

        {!locationStatus.inRange && !selectedBusinessTrip && location && adminSettings?.company_latitude && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            {locationStatus.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
