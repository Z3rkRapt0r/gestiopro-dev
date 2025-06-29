
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, AlertCircle, XCircle, Info, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useAuth } from '@/hooks/useAuth';
import { useAttendanceOperations } from '@/hooks/useAttendanceOperations';
import { useAttendanceSettings } from '@/hooks/useAttendanceSettings';
import GPSStatusIndicator from './GPSStatusIndicator';
import { useEmployeeStatus } from '@/hooks/useEmployeeStatus';
import AttendanceDelayBadge from './AttendanceDelayBadge';

export default function AttendanceCheckInOut() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const {
    user
  } = useAuth();
  const {
    checkIn,
    checkOut,
    isCheckingIn,
    isCheckingOut
  } = useAttendanceOperations();
  const {
    attendances
  } = useUnifiedAttendances();
  const {
    workSchedule
  } = useWorkSchedules();
  const {
    settings: attendanceSettings
  } = useAttendanceSettings();
  const {
    employeeStatus,
    isLoading: statusLoading
  } = useEmployeeStatus();

  // Trova la presenza di oggi dalla tabella unificata
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAttendance = attendances?.find(att => att.user_id === user?.id && att.date === today);
  
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
      case 0:
        return workSchedule.sunday;
      case 1:
        return workSchedule.monday;
      case 2:
        return workSchedule.tuesday;
      case 3:
        return workSchedule.wednesday;
      case 4:
        return workSchedule.thursday;
      case 5:
        return workSchedule.friday;
      case 6:
        return workSchedule.saturday;
      default:
        return false;
    }
  };

  const handleCheckIn = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(position => {
        checkIn({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      }, error => {
        console.error('Error getting location:', error);
        checkIn({
          latitude: 0,
          longitude: 0
        });
      });
    } else {
      checkIn({
        latitude: 0,
        longitude: 0
      });
    }
  };

  const handleCheckOut = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(position => {
        checkOut({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      }, error => {
        console.error('Error getting location:', error);
        checkOut({
          latitude: 0,
          longitude: 0
        });
      });
    } else {
      checkOut({
        latitude: 0,
        longitude: 0
      });
    }
  };

  const currentTimeString = format(currentTime, 'HH:mm:ss', {
    locale: it
  });
  const currentDateString = format(currentTime, 'EEEE, dd MMMM yyyy', {
    locale: it
  });

  // Verifica se il check-out è abilitato dalle impostazioni
  const isCheckoutEnabled = attendanceSettings?.checkout_enabled ?? true;

  // Determina il tipo di alert in base alla priorità del conflitto
  const getConflictAlertVariant = (priority: number) => {
    if (priority >= 4) return 'destructive'; // Malattia, Ferie
    if (priority >= 3) return 'destructive'; // Trasferta
    if (priority >= 2) return 'default'; // Permesso attivo
    return 'secondary'; // Presenza già registrata, richieste pending
  };

  const getConflictIcon = (priority: number, status: string) => {
    if (priority >= 4) return XCircle;
    if (priority >= 3) return XCircle;
    if (status === 'permission_ended') return CheckCircle;
    return AlertCircle;
  };

  // Funzione per determinare se mostrare il countdown per i permessi orari
  const getPermissionCountdown = () => {
    if (!employeeStatus?.statusDetails) return null;
    
    if (employeeStatus.currentStatus === 'permission_active' && employeeStatus.statusDetails.timeTo) {
      return `Permesso attivo fino alle ${employeeStatus.statusDetails.timeTo}`;
    }
    
    if (employeeStatus.currentStatus === 'permission_ended' && employeeStatus.canCheckInAfterTime) {
      return `Puoi registrare la presenza (permesso terminato alle ${employeeStatus.canCheckInAfterTime})`;
    }
    
    return null;
  };

  return <div className="max-w-md mx-auto space-y-6">
      {/* Info configurazione orari di lavoro */}
      {workSchedule && <Card>
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
        </Card>}

      {/* Avviso per checkout disabilitato */}
      {!isCheckoutEnabled}

      {/* Avviso per giorni non lavorativi */}
      {!isWorkingDay() && <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Oggi non è configurato come giorno lavorativo
              </span>
            </div>
          </CardContent>
        </Card>}

      {/* Avvisi di conflitto con messaggi migliorati per permessi */}
      {employeeStatus && employeeStatus.conflictPriority > 0 && <Card className={`border-2 ${employeeStatus.conflictPriority >= 4 ? 'border-red-200 bg-red-50' : employeeStatus.conflictPriority >= 3 ? 'border-red-200 bg-red-50' : employeeStatus.currentStatus === 'permission_ended' ? 'border-green-200 bg-green-50' : employeeStatus.conflictPriority >= 2 ? 'border-yellow-200 bg-yellow-50' : 'border-blue-200 bg-blue-50'}`}>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {(() => {
              const IconComponent = getConflictIcon(employeeStatus.conflictPriority, employeeStatus.currentStatus);
              return <IconComponent className={`w-5 h-5 ${employeeStatus.conflictPriority >= 4 ? 'text-red-600' : employeeStatus.conflictPriority >= 3 ? 'text-red-600' : employeeStatus.currentStatus === 'permission_ended' ? 'text-green-600' : employeeStatus.conflictPriority >= 2 ? 'text-yellow-600' : 'text-blue-600'}`} />;
            })()}
                <span className={`font-semibold ${employeeStatus.conflictPriority >= 4 ? 'text-red-800' : employeeStatus.conflictPriority >= 3 ? 'text-red-800' : employeeStatus.currentStatus === 'permission_ended' ? 'text-green-800' : employeeStatus.conflictPriority >= 2 ? 'text-yellow-800' : 'text-blue-800'}`}>
                  {employeeStatus.conflictPriority >= 4 && 'PRESENZA VIETATA'}
                  {employeeStatus.conflictPriority === 3 && 'PRESENZA VIETATA - TRASFERTA'}
                  {employeeStatus.currentStatus === 'permission_active' && 'PERMESSO ATTIVO'}
                  {employeeStatus.currentStatus === 'permission_ended' && 'PERMESSO TERMINATO'}
                  {employeeStatus.conflictPriority === 1 && 'GIÀ PRESENTE'}
                  {employeeStatus.currentStatus === 'pending_request' && 'RICHIESTA IN ATTESA'}
                </span>
              </div>
              
              <div className={`text-sm ${employeeStatus.conflictPriority >= 4 ? 'text-red-700' : employeeStatus.conflictPriority >= 3 ? 'text-red-700' : employeeStatus.currentStatus === 'permission_ended' ? 'text-green-700' : employeeStatus.conflictPriority >= 2 ? 'text-yellow-700' : 'text-blue-700'}`}>
                {employeeStatus.blockingReasons.map((reason, index) => <p key={index}>• {reason}</p>)}
                
                {/* Messaggio speciale per permessi orari */}
                {getPermissionCountdown() && (
                  <p className="mt-2 font-medium">
                    • {getPermissionCountdown()}
                  </p>
                )}
              </div>

              {employeeStatus.statusDetails && <div className={`mt-3 p-3 rounded-md text-xs ${employeeStatus.conflictPriority >= 4 ? 'bg-red-100 text-red-800' : employeeStatus.conflictPriority >= 3 ? 'bg-red-100 text-red-800' : employeeStatus.currentStatus === 'permission_ended' ? 'bg-green-100 text-green-800' : employeeStatus.conflictPriority >= 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                  <div className="font-semibold mb-1">Dettagli stato:</div>
                  <div><strong>Tipo:</strong> {employeeStatus.statusDetails.type}</div>
                  {employeeStatus.statusDetails.startDate && <div><strong>Data:</strong> {employeeStatus.statusDetails.startDate}
                      {employeeStatus.statusDetails.endDate && employeeStatus.statusDetails.endDate !== employeeStatus.statusDetails.startDate && ` - ${employeeStatus.statusDetails.endDate}`}
                    </div>}
                  {employeeStatus.statusDetails.timeFrom && employeeStatus.statusDetails.timeTo && <div><strong>Orario:</strong> {employeeStatus.statusDetails.timeFrom} - {employeeStatus.statusDetails.timeTo}</div>}
                  {employeeStatus.statusDetails.canCheckInAfter && <div><strong>Check-in consentito dopo:</strong> {employeeStatus.statusDetails.canCheckInAfter}</div>}
                  {employeeStatus.statusDetails.notes && <div><strong>Note:</strong> {employeeStatus.statusDetails.notes}</div>}
                </div>}
            </div>
          </CardContent>
        </Card>}

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
          {todayAttendance ? <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Entrata</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-700 font-bold">
                    {todayAttendance.check_in_time || '--:--'}
                  </span>
                  {todayAttendance.check_in_time && (
                    <AttendanceDelayBadge 
                      isLate={todayAttendance.is_late || false}
                      lateMinutes={todayAttendance.late_minutes || 0}
                    />
                  )}
                </div>
              </div>

              {todayAttendance.check_out_time ? <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Uscita</span>
                  </div>
                  <span className="text-blue-700 font-bold">
                    {todayAttendance.check_out_time}
                  </span>
                </div> : <>
                  {isCheckoutEnabled ? <Button onClick={handleCheckOut} disabled={isCheckingOut || !employeeStatus?.canCheckOut} className="w-full" variant="outline">
                      {isCheckingOut ? 'Registrando uscita...' : 'Registra Uscita'}
                    </Button> : null}
                </>}

              {/* Mostra se è stata registrata manualmente */}
              {todayAttendance.is_manual && <div className="text-center text-sm text-gray-600">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Presenza inserita manualmente
                  </Badge>
                </div>}
            </div> : <div className="space-y-3">
              <Button 
                onClick={handleCheckIn} 
                disabled={isCheckingIn || !employeeStatus?.canCheckIn || statusLoading || (employeeStatus?.conflictPriority ?? 0) > 0} 
                className="w-full" 
                variant={employeeStatus?.canCheckIn || employeeStatus?.currentStatus === 'permission_ended' ? "default" : "secondary"}
              >
                {isCheckingIn ? 'Registrando entrata...' : 
                 employeeStatus?.currentStatus === 'permission_ended' ? 'Registra Entrata (Dopo Permesso)' :
                 !employeeStatus?.canCheckIn ? 'Presenza non consentita' : 'Registra Entrata'}
              </Button>
              
              {/* Indicatore di priorità del conflitto con messaggi specifici */}
              {employeeStatus && employeeStatus.conflictPriority > 0 && <div className="text-center">
                  <Badge variant={getConflictAlertVariant(employeeStatus.conflictPriority)}>
                    {employeeStatus.conflictPriority >= 4 && 'BLOCCATO - Conflitto critico'}
                    {employeeStatus.conflictPriority === 3 && 'BLOCCATO - In trasferta'}
                    {employeeStatus.currentStatus === 'permission_active' && 'BLOCCATO - Permesso attivo'}
                    {employeeStatus.currentStatus === 'permission_ended' && 'DISPONIBILE - Permesso terminato'}
                    {employeeStatus.conflictPriority === 1 && 'BLOCCATO - Già presente'}
                  </Badge>
                </div>}
            </div>}
        </CardContent>
      </Card>
    </div>;
}
