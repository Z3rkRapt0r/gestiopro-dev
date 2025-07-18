
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, AlertCircle, Calendar } from 'lucide-react';
import { useAttendances } from '@/hooks/useAttendances';
import { useAuth } from '@/hooks/useAuth';
import { useGPSValidation } from '@/hooks/useGPSValidation';
import { useAttendanceHolidays } from '@/hooks/useAttendanceHolidays';
import GPSStatusIndicator from './GPSStatusIndicator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export default function AttendanceCheckInOut() {
  const { profile } = useAuth();
  const { attendances, checkIn, checkOut, isLoading } = useAttendances();
  const { validateLocation } = useGPSValidation();
  const { checkAttendanceHoliday, getHolidayMessage } = useAttendanceHolidays();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isValidating, setIsValidating] = useState(false);
  const [holidayCheck, setHolidayCheck] = useState<{
    isHoliday: boolean;
    message: string | null;
  }>({ isHoliday: false, message: null });

  // Trova la presenza di oggi
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendances?.find(att => att.date === today && att.user_id === profile?.id);

  // Aggiorna l'orario ogni secondo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Controlla se oggi è un giorno festivo
  useEffect(() => {
    const checkHoliday = async () => {
      const today = new Date();
      const result = await checkAttendanceHoliday(today);
      setHolidayCheck({
        isHoliday: result.isHoliday,
        message: result.message
      });
    };

    checkHoliday();
  }, [checkAttendanceHoliday]);

  const validateGPS = async () => {
    setIsValidating(true);
    try {
      return new Promise<{
        isValid: boolean;
        latitude?: number;
        longitude?: number;
        message?: string;
      }>((resolve, reject) => {
        if (!navigator.geolocation) {
          resolve({
            isValid: false,
            message: 'Geolocalizzazione non supportata dal browser'
          });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const validation = validateLocation(latitude, longitude);
            
            resolve({
              isValid: validation.isValid,
              latitude,
              longitude,
              message: validation.message
            });
          },
          (error) => {
            console.error('Errore geolocalizzazione:', error);
            resolve({
              isValid: false,
              message: 'Impossibile ottenere la posizione. Verifica le impostazioni del browser.'
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleCheckIn = async () => {
    // Prima controlla se è un giorno festivo
    if (holidayCheck.isHoliday) {
      toast.error(holidayCheck.message || 'Non è possibile registrare presenza in un giorno festivo');
      return;
    }

    try {
      const gpsValidation = await validateGPS();
      if (!gpsValidation.isValid) {
        toast.error(gpsValidation.message);
        return;
      }

      await checkIn({
        latitude: gpsValidation.latitude!,
        longitude: gpsValidation.longitude!,
      });
    } catch (error) {
      console.error('Errore durante il check-in:', error);
    }
  };

  const handleCheckOut = async () => {
    // Prima controlla se è un giorno festivo (anche per il check-out)
    if (holidayCheck.isHoliday) {
      toast.error(holidayCheck.message || 'Non è possibile registrare presenza in un giorno festivo');
      return;
    }

    try {
      const gpsValidation = await validateGPS();
      if (!gpsValidation.isValid) {
        toast.error(gpsValidation.message);
        return;
      }

      await checkOut({
        latitude: gpsValidation.latitude!,
        longitude: gpsValidation.longitude!,
      });
    } catch (error) {
      console.error('Errore durante il check-out:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Se è un giorno festivo, mostra un messaggio informativo
  if (holidayCheck.isHoliday) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Presenza Oggi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <h3 className="text-lg font-medium mb-2">Giorno Festivo</h3>
            <p className="text-muted-foreground mb-4">
              {getHolidayMessage(new Date())}
            </p>
            <p className="text-sm text-muted-foreground">
              Le registrazioni di presenza sono disabilitate nei giorni festivi aziendali.
            </p>
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
          Presenza Oggi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">
            {formatTime(currentTime)}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDate(currentTime)}
          </div>
        </div>

        <GPSStatusIndicator />

        {todayAttendance && (
          <div className="space-y-2">
            {todayAttendance.check_in_time && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-800">Entrata</span>
                <span className="text-sm text-green-600">
                  {new Date(todayAttendance.check_in_time).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {todayAttendance.check_out_time && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-red-800">Uscita</span>
                <span className="text-sm text-red-600">
                  {new Date(todayAttendance.check_out_time).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {!todayAttendance?.check_in_time ? (
            <Button
              onClick={handleCheckIn}
              disabled={isLoading || isValidating}
              className="flex-1"
            >
              <MapPin className="w-4 h-4 mr-2" />
              {isValidating ? 'Validando GPS...' : 'Entrata'}
            </Button>
          ) : !todayAttendance?.check_out_time ? (
            <Button
              onClick={handleCheckOut}
              disabled={isLoading || isValidating}
              variant="outline"
              className="flex-1"
            >
              <MapPin className="w-4 h-4 mr-2" />
              {isValidating ? 'Validando GPS...' : 'Uscita'}
            </Button>
          ) : (
            <div className="flex-1 text-center py-2 text-sm text-muted-foreground">
              Presenza registrata per oggi ✓
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
