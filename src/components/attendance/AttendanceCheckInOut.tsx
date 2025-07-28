
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, AlertCircle, XCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useUnifiedAttendances } from '@/hooks/useUnifiedAttendances';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useEmployeeWorkSchedule } from '@/hooks/useEmployeeWorkSchedule';
import { useAuth } from '@/hooks/useAuth';
import { useAttendanceOperations } from '@/hooks/useAttendanceOperations';
import { useAttendanceSettings } from '@/hooks/useAttendanceSettings';
import GPSStatusIndicator from './GPSStatusIndicator';
import { useEmployeeStatus } from '@/hooks/useEmployeeStatus';
import AttendanceDelayBadge from './AttendanceDelayBadge';

export default function AttendanceCheckInOut() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();
  const { checkIn, checkOut, isCheckingIn, isCheckingOut } = useAttendanceOperations();
  const { attendances } = useUnifiedAttendances();
  const { workSchedule: companyWorkSchedule } = useWorkSchedules();
  const { workSchedule: employeeWorkSchedule } = useEmployeeWorkSchedule(user?.id);
  const { settings: attendanceSettings } = useAttendanceSettings();
  const { employeeStatus, isLoading: statusLoading } = useEmployeeStatus();

  // Usa orari personalizzati se disponibili, altrimenti orari aziendali
  const workSchedule = employeeWorkSchedule || companyWorkSchedule;

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
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    if (employeeWorkSchedule) {
      // Orari personalizzati: usa work_days array
      return employeeWorkSchedule.work_days.includes(dayName);
    } else if (companyWorkSchedule) {
      // Orari aziendali: usa i booleani
      switch (dayOfWeek) {
        case 0: return companyWorkSchedule.sunday;
        case 1: return companyWorkSchedule.monday;
        case 2: return companyWorkSchedule.tuesday;
        case 3: return companyWorkSchedule.wednesday;
        case 4: return companyWorkSchedule.thursday;
        case 5: return companyWorkSchedule.friday;
        case 6: return companyWorkSchedule.saturday;
        default: return false;
      }
    }
    return false;
  };

  const handleCheckIn = async () => {
    // Controllo preventivo con priorità di conflitto
    if (!employeeStatus?.canCheckIn || employeeStatus.conflictPriority > 0) {
      return;
    }
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          checkIn({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        }, 
        error => {
          console.error('Error getting location:', error);
          checkIn({ latitude: 0, longitude: 0 });
        }
      );
    } else {
      checkIn({ latitude: 0, longitude: 0 });
    }
  };

  const handleCheckOut = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          checkOut({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        }, 
        error => {
          console.error('Error getting location:', error);
          checkOut({ latitude: 0, longitude: 0 });
        }
      );
    } else {
      checkOut({ latitude: 0, longitude: 0 });
    }
  };

  const currentTimeString = format(currentTime, 'HH:mm:ss', { locale: it });
  const currentDateString = format(currentTime, 'EEEE, dd MMMM yyyy', { locale: it });

  // Verifica se il check-out è abilitato dalle impostazioni
  const isCheckoutEnabled = attendanceSettings?.checkout_enabled ?? true;

  // Determina il tipo di alert in base alla priorità del conflitto
  const getConflictAlertVariant = (priority: number) => {
    if (priority >= 4) return 'destructive'; // Malattia, Ferie
    if (priority >= 2) return 'default'; // Permesso, Trasferta
    return 'secondary'; // Presenza già registrata, richieste pending
  };

  const getConflictIcon = (priority: number) => {
    if (priority >= 4) return XCircle;
    return AlertCircle;
  };

  return (
    <div className="max-w-sm sm:max-w-md mx-auto space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Info configurazione orari di lavoro */}
      {workSchedule && (
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate">Orari di Lavoro</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Orario:</span>
              <span className="font-medium text-sm sm:text-base">
                {workSchedule.start_time} - {workSchedule.end_time}
                {employeeWorkSchedule && (
                  <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700">
                    Personalizzati
                  </Badge>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Oggi:</span>
              <Badge variant={isWorkingDay() ? "default" : "secondary"} className="text-xs">
                {isWorkingDay() ? "Giorno lavorativo" : "Non lavorativo"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tolleranza:</span>
              <span className="font-medium text-sm sm:text-base">{workSchedule.tolerance_minutes} minuti</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Avviso per giorni non lavorativi */}
      {!isWorkingDay() && (
        <Card className="border-orange-200 bg-orange-50 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                Oggi non è configurato come giorno lavorativo
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Avvisi di conflitto con priorità */}
      {employeeStatus && employeeStatus.conflictPriority > 0 && (
        <Card className={`border-2 hover:shadow-lg transition-all duration-300 ${
          employeeStatus.conflictPriority >= 4 
            ? 'border-red-200 bg-red-50' 
            : employeeStatus.conflictPriority >= 2 
            ? 'border-yellow-200 bg-yellow-50' 
            : 'border-blue-200 bg-blue-50'
        }`}>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {(() => {
                  const IconComponent = getConflictIcon(employeeStatus.conflictPriority);
                  return (
                    <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${
                      employeeStatus.conflictPriority >= 4 
                        ? 'text-red-600' 
                        : employeeStatus.conflictPriority >= 2 
                        ? 'text-yellow-600' 
                        : 'text-blue-600'
                    }`} />
                  );
                })()}
                <span className={`font-semibold text-sm sm:text-base ${
                  employeeStatus.conflictPriority >= 4 
                    ? 'text-red-800' 
                    : employeeStatus.conflictPriority >= 2 
                    ? 'text-yellow-800' 
                    : 'text-blue-800'
                }`}>
                  {employeeStatus.conflictPriority >= 4 && 'PRESENZA VIETATA'}
                  {employeeStatus.conflictPriority === 3 && 'BLOCCATO - Permesso attivo'}
                  {employeeStatus.conflictPriority === 2 && 'CONFLITTO RILEVATO'}
                  {employeeStatus.conflictPriority === 1 && 'INFORMAZIONE'}
                </span>
              </div>
              
              <div className={`text-sm ${
                employeeStatus.conflictPriority >= 4 
                  ? 'text-red-700' 
                  : employeeStatus.conflictPriority >= 2 
                  ? 'text-yellow-700' 
                  : 'text-blue-700'
              }`}>
                {employeeStatus.blockingReasons.map((reason, index) => (
                  <p key={index}>• {reason}</p>
                ))}
              </div>

              {employeeStatus.statusDetails && (
                <div className={`mt-3 p-3 rounded-md text-xs ${
                  employeeStatus.conflictPriority >= 4 
                    ? 'bg-red-100 text-red-800' 
                    : employeeStatus.conflictPriority >= 2 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  <div className="font-semibold mb-1">Dettagli stato:</div>
                  <div><strong>Tipo:</strong> {employeeStatus.statusDetails.type}</div>
                  {employeeStatus.statusDetails.startDate && (
                    <div><strong>Data:</strong> {employeeStatus.statusDetails.startDate}
                      {employeeStatus.statusDetails.endDate && 
                       employeeStatus.statusDetails.endDate !== employeeStatus.statusDetails.startDate && 
                       ` - ${employeeStatus.statusDetails.endDate}`}
                    </div>
                  )}
                  {employeeStatus.statusDetails.timeFrom && employeeStatus.statusDetails.timeTo && (
                    <div><strong>Orario:</strong> {employeeStatus.statusDetails.timeFrom} - {employeeStatus.statusDetails.timeTo}</div>
                  )}
                  {employeeStatus.statusDetails.notes && (
                    <div><strong>Note:</strong> {employeeStatus.statusDetails.notes}</div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orologio */}
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardContent className="text-center py-6 sm:py-8">
          <div className="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold text-primary mb-2">
            {currentTimeString}
          </div>
          <div className="text-sm sm:text-base lg:text-lg text-muted-foreground capitalize px-2">
            {currentDateString}
          </div>
        </CardContent>
      </Card>

      {/* Status GPS */}
      <GPSStatusIndicator />

      {/* Controlli presenze */}
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Presenze</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayAttendance ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-700">Entrata</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-700 font-bold text-sm sm:text-base">
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

              {todayAttendance.check_out_time ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-700">Uscita</span>
                  </div>
                  <span className="text-blue-700 font-bold text-sm sm:text-base">
                    {todayAttendance.check_out_time}
                  </span>
                </div>
              ) : (
                <>
                  {isCheckoutEnabled && (
                    <Button 
                      onClick={handleCheckOut} 
                      disabled={isCheckingOut || !employeeStatus?.canCheckOut} 
                      className="w-full min-h-[44px] text-sm sm:text-base" 
                      variant="outline"
                    >
                      {isCheckingOut ? 'Registrando uscita...' : 'Registra Uscita'}
                    </Button>
                  )}
                </>
              )}

              {/* Mostra se è stata registrata manualmente */}
              {todayAttendance.is_manual && (
                <div className="text-center text-sm text-gray-600">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                    Presenza inserita manualmente
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Button 
                onClick={handleCheckIn} 
                disabled={isCheckingIn || !employeeStatus?.canCheckIn || statusLoading || (employeeStatus?.conflictPriority ?? 0) > 0} 
                className="w-full min-h-[44px] text-sm sm:text-base" 
                variant={employeeStatus?.canCheckIn ? "default" : "secondary"}
              >
                {isCheckingIn ? 'Registrando entrata...' : !employeeStatus?.canCheckIn ? 'Presenza non consentita' : 'Registra Entrata'}
              </Button>
              
              {/* Indicatore di priorità del conflitto */}
              {employeeStatus && employeeStatus.conflictPriority > 0 && (
                <div className="text-center">
                  <Badge variant={getConflictAlertVariant(employeeStatus.conflictPriority)} className="text-xs">
                    {employeeStatus.conflictPriority >= 4 && 'BLOCCATO - Conflitto critico'}
                    {employeeStatus.conflictPriority === 3 && 'BLOCCATO - Permesso attivo'}
                    {employeeStatus.conflictPriority === 2 && 'BLOCCATO - In trasferta'}
                    {employeeStatus.conflictPriority === 1 && 'BLOCCATO - Già presente'}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
