import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useAuth } from '@/hooks/useAuth';
import { useAttendanceOperations } from '@/hooks/useAttendanceOperations';
import GPSStatusIndicator from './GPSStatusIndicator';
import { useEmployeeStatus } from '@/hooks/useEmployeeStatus';

export default function AttendanceCheckInOut() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();
  const { 
    checkIn, 
    checkOut, 
    isCheckingIn, 
    isCheckingOut 
  } = useAttendanceOperations();
  const { attendances } = useUnifiedAttendances();
  const { workSchedule } = useWorkSchedules();
  const { employeeStatus, isLoading: statusLoading } = useEmployeeStatus();

  // Trova la presenza di oggi dalla tabella unificata
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAttendance = attendances?.find(att => 
    att.user_id === user?.id && att.date === today
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Verifica se oggi è un giorno lavorativo
  const isWorkingDay = () => {
    if (!workSchedule) return false;
    
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    switch (dayOfWeek) {
      case 0: return workSchedule.sunday;
      case 1: return workSchedule.monday;
      case 2: return workSchedule.tuesday;
      case 3: return workSchedule.wednesday;
      case 4: return workSchedule.thursday;
      case 5: return workSchedule.friday;
      case 6: return workSchedule.saturday;
      default: return false;
    }
  };

  const handleCheckIn = async () => {
    // Controlla se è già stata registrata una presenza
    if (todayAttendance) {
      return; // Il pulsante dovrebbe essere disabilitato, ma aggiungiamo comunque il controllo
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          checkIn({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Fallback senza coordinate GPS
          checkIn({
            latitude: 0,
            longitude: 0,
          });
        }
      );
    } else {
      // Fallback se la geolocalizzazione non è supportata
      checkIn({
        latitude: 0,
        longitude: 0,
      });
    }
  };

  const handleCheckOut = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          checkOut({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Fallback senza coordinate GPS
          checkOut({
            latitude: 0,
            longitude: 0,
          });
        }
      );
    } else {
      // Fallback se la geolocalizzazione non è supportata
      checkOut({
        latitude: 0,
        longitude: 0,
      });
    }
  };

  const currentTimeString = format(currentTime, 'HH:mm:ss', { locale: it });
  const currentDateString = format(currentTime, 'EEEE, dd MMMM yyyy', { locale: it });

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Info configurazione orari di lavoro */}
      {workSchedule && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Orari di Lavoro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Orario:</span>
              <span className="font-medium">{workSchedule.start_time} - {workSchedule.end_time}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Oggi:</span>
              <Badge variant={isWorkingDay() ? "default" : "secondary"}>
                {isWorkingDay() ? "Giorno lavorativo" : "Non lavorativo"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tolleranza:</span>
              <span className="font-medium">{workSchedule.tolerance_minutes} minuti</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Avviso per giorni non lavorativi */}
      {!isWorkingDay() && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Oggi non è configurato come giorno lavorativo
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Avvisi di blocco per stati speciali */}
      {employeeStatus && employeeStatus.blockingReasons.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Non puoi registrare la presenza
                </span>
              </div>
              <div className="text-sm text-red-600">
                {employeeStatus.blockingReasons.map((reason, index) => (
                  <p key={index}>• {reason}</p>
                ))}
              </div>
              {employeeStatus.statusDetails && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                  <strong>Stato attuale:</strong> {employeeStatus.statusDetails.type}
                  {employeeStatus.statusDetails.startDate && employeeStatus.statusDetails.endDate && (
                    <span> ({employeeStatus.statusDetails.startDate} - {employeeStatus.statusDetails.endDate})</span>
                  )}
                  {employeeStatus.statusDetails.notes && (
                    <div>Note: {employeeStatus.statusDetails.notes}</div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orologio */}
      <Card>
        <CardContent className="text-center py-8">
          <div className="text-4xl font-mono font-bold text-primary mb-2">
            {currentTimeString}
          </div>
          <div className="text-lg text-muted-foreground capitalize">
            {currentDateString}
          </div>
        </CardContent>
      </Card>

      {/* Status GPS */}
      <GPSStatusIndicator />

      {/* Controlli presenze */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Presenze</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayAttendance ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Entrata</span>
                </div>
                <span className="text-green-700 font-bold">
                  {todayAttendance.check_in_time || '--:--'}
                </span>
              </div>

              {todayAttendance.check_out_time ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Uscita</span>
                  </div>
                  <span className="text-blue-700 font-bold">
                    {todayAttendance.check_out_time}
                  </span>
                </div>
              ) : (
                <Button 
                  onClick={handleCheckOut} 
                  disabled={isCheckingOut || !employeeStatus?.canCheckOut} 
                  className="w-full"
                  variant="outline"
                >
                  {isCheckingOut ? 'Registrando uscita...' : 'Registra Uscita'}
                </Button>
              )}

              {/* Mostra se è stata registrata manualmente */}
              {todayAttendance.is_manual && (
                <div className="text-center text-sm text-gray-600">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Presenza inserita manualmente
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <Button 
              onClick={handleCheckIn} 
              disabled={isCheckingIn || !employeeStatus?.canCheckIn || statusLoading} 
              className="w-full"
            >
              {isCheckingIn ? 'Registrando entrata...' : 'Registra Entrata'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
