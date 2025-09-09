
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
import { useMultipleCheckins } from '@/hooks/useMultipleCheckins';
import AttendanceDelayBadge from './AttendanceDelayBadge';

export default function AttendanceCheckInOut() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();
  const { checkIn, checkOut, secondCheckIn, isCheckingIn, isCheckingOut, isSecondCheckingIn } = useAttendanceOperations();
  const { attendances } = useUnifiedAttendances();
  const { workSchedule: companyWorkSchedule } = useWorkSchedules();
  const { workSchedule: employeeWorkSchedule } = useEmployeeWorkSchedule(user?.id);
  const { settings: attendanceSettings } = useAttendanceSettings();
  const { employeeStatus, isLoading: statusLoading } = useEmployeeStatus();
  const { todayCheckins } = useMultipleCheckins(user?.id);

  // Debug per vedere lo stato completo
  console.log('🔍 EmployeeStatus completo:', JSON.stringify(employeeStatus, null, 2));
  
  // Debug per vedere le presenze di oggi
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAttendances = attendances?.filter(att => att.date === today) || [];
  console.log('🔍 Presenze di oggi:', todayAttendances);
  
  // Debug per vedere se ci sono permessi orari per oggi
  console.log('🔍 Data di oggi:', today);
  console.log('🔍 Orario attuale:', new Date().toTimeString());

  // Usa orari personalizzati se disponibili, altrimenti orari aziendali
  const workSchedule = employeeWorkSchedule || companyWorkSchedule;

  // Debug: Log per diagnosticare il problema
  console.log('🔍 [AttendanceCheckInOut] Debug orari:', {
    userId: user?.id,
    userName: user?.email,
    employeeWorkSchedule: employeeWorkSchedule,
    companyWorkSchedule: companyWorkSchedule,
    finalWorkSchedule: workSchedule,
    isUsingPersonalized: !!employeeWorkSchedule
  });

  // Trova la presenza di oggi dalla tabella unificata
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

  const handleSecondCheckIn = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          secondCheckIn({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        }, 
        error => {
          console.error('Error getting location:', error);
          secondCheckIn({ latitude: 0, longitude: 0 });
        }
      );
    } else {
      secondCheckIn({ latitude: 0, longitude: 0 });
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
      {/* Blocco permesso attivo - Sopra l'orologio */}
      {employeeStatus && employeeStatus.conflictPriority === 3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="font-semibold text-yellow-800">
              Permesso attivo
            </span>
          </div>
          {employeeStatus.statusDetails && (
            <div className="mt-2 text-sm text-yellow-700">
              <div className="font-medium">
                {employeeStatus.statusDetails.timeFrom} - {employeeStatus.statusDetails.timeTo}
              </div>
              <div className="mt-1 text-xs text-yellow-600">
                {(() => {
                  // Controlla se c'è stata una prima entrata normale PRIMA dell'inizio del permesso
                  const hasMainCheckin = todayAttendance?.check_in_time ? true : false;
                  const hasFirstCheckin = todayCheckins?.some(checkin => !checkin.is_second_checkin) || false;
                  
                  // Controlla se l'entrata principale è stata fatta PRIMA dell'inizio del permesso
                  let isMainCheckinBeforePermission = false;
                  if (hasMainCheckin && todayAttendance?.check_in_time && employeeStatus?.statusDetails?.timeFrom) {
                    const checkinTime = todayAttendance.check_in_time;
                    const permissionStartTime = employeeStatus.statusDetails.timeFrom;
                    
                    // Confronta gli orari (formato HH:mm:ss)
                    isMainCheckinBeforePermission = checkinTime < permissionStartTime;
                  }
                  
                  // Controlla se ci sono check-in multipli PRIMA dell'inizio del permesso
                  let isFirstCheckinBeforePermission = false;
                  if (hasFirstCheckin && employeeStatus?.statusDetails?.timeFrom) {
                    const permissionStartTime = employeeStatus.statusDetails.timeFrom;
                    isFirstCheckinBeforePermission = todayCheckins?.some(checkin => 
                      !checkin.is_second_checkin && checkin.checkin_time < permissionStartTime
                    ) || false;
                  }
                  
                  // È un permesso "in mezzo alla giornata" solo se c'è stata un'entrata PRIMA del permesso
                  const isPermissionInMiddleOfDay = isMainCheckinBeforePermission || isFirstCheckinBeforePermission;
                  
                  console.log('🔍 Debug messaggio permesso:', {
                    hasMainCheckin,
                    hasFirstCheckin,
                    isMainCheckinBeforePermission,
                    isFirstCheckinBeforePermission,
                    isPermissionInMiddleOfDay,
                    checkinTime: todayAttendance?.check_in_time,
                    permissionStartTime: employeeStatus?.statusDetails?.timeFrom,
                    todayAttendance: !!todayAttendance,
                    todayCheckins: todayCheckins?.length || 0,
                    isPermissionExpired: employeeStatus?.isPermissionExpired,
                    conflictPriority: employeeStatus?.conflictPriority
                  });
                  
                  if (isPermissionInMiddleOfDay) {
                    // Permesso in mezzo alla giornata - serve seconda entrata
                    return "Dovrai effettuare una seconda registrazione di ingresso dopo il termine del permesso";
                  } else {
                    // Permesso dall'inizio del turno - non serve seconda entrata
                    return "La prima registrazione di ingresso che effettuerai sarà considerata come entrata principale";
                  }
                })()}
              </div>
            </div>
          )}
        </div>
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

      {/* Controlli presenze */}
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Presenze</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayAttendance ? (
            <div className="space-y-4">
              {/* Sezione Entrata Principale */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-200 rounded-full">
                      <Clock className="w-5 h-5 text-green-700" />
                    </div>
                    <span className="text-lg font-semibold text-green-800">Entrata</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-800">
                      {(() => {
                        if (!todayAttendance.check_in_time) return '--:--';
                        
                        // Se è un timestamp completo (contiene 'T'), estrai solo l'orario
                        if (todayAttendance.check_in_time.includes('T')) {
                          const timePart = todayAttendance.check_in_time.split('T')[1];
                          return timePart.split('.')[0]; // Rimuovi i millisecondi se presenti
                        }
                        
                        // Se è già solo orario, restituisci così
                        return todayAttendance.check_in_time;
                      })()}
                    </div>
                    {todayAttendance.check_in_time && (
                      <div className="mt-1">
                        <AttendanceDelayBadge 
                          isLate={todayAttendance.is_late || false}
                          lateMinutes={todayAttendance.late_minutes || 0}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {todayAttendance.check_out_time ? (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-200 rounded-full">
                        <Clock className="w-5 h-5 text-blue-700" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-blue-800">Uscita</h3>
                        <p className="text-sm text-blue-600">Fine giornata lavorativa</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-800">
                        {(() => {
                          if (!todayAttendance.check_out_time) return '--:--';
                          
                          // Se è un timestamp completo (contiene 'T'), estrai solo l'orario
                          if (todayAttendance.check_out_time.includes('T')) {
                            const timePart = todayAttendance.check_out_time.split('T')[1];
                            return timePart.split('.')[0]; // Rimuovi i millisecondi se presenti
                          }
                          
                          // Se è già solo orario, restituisci così
                          return todayAttendance.check_out_time;
                        })()}
                      </div>
                    </div>
                  </div>
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

              {/* Mostra i check-in multipli di oggi */}
              {todayCheckins && todayCheckins.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px bg-gray-300 flex-1"></div>
                    <span className="text-sm font-semibold text-gray-600 bg-white px-3">Check-in Aggiuntivi</span>
                    <div className="h-px bg-gray-300 flex-1"></div>
                  </div>
                  <div className="space-y-2">
                    {todayCheckins.map((checkin) => (
                      <div key={checkin.id} className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-200 rounded-full">
                              <Clock className="w-4 h-4 text-orange-700" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-orange-800">
                                {checkin.is_second_checkin ? 'Seconda Entrata' : 'Check-in Aggiuntivo'}
                              </h4>
                              <p className="text-xs text-orange-600">
                                {checkin.is_second_checkin ? 'Dopo permesso orario' : 'Registrazione aggiuntiva'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-orange-800">
                              {checkin.checkin_time}
                            </div>
                            {checkin.checkout_time && (
                              <div className="text-sm text-orange-600">
                                Uscita: {checkin.checkout_time}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Button 
                onClick={handleCheckIn} 
                disabled={isCheckingIn || !employeeStatus?.canCheckIn || statusLoading || (employeeStatus?.conflictPriority ?? 0) > 0 || !isWorkingDay()} 
                className="w-full min-h-[44px] text-sm sm:text-base" 
                variant={employeeStatus?.canCheckIn && isWorkingDay() ? "default" : "secondary"}
              >
                {isCheckingIn ? 'Registrando entrata...' : !employeeStatus?.canCheckIn || !isWorkingDay() ? 'Presenza non consentita' : 'Registra Entrata'}
              </Button>

              
              {/* Indicatore di priorità del conflitto - Escludi presenza già registrata */}
              {employeeStatus && employeeStatus.conflictPriority > 1 && (
                <div className="text-center">
                  <Badge variant={getConflictAlertVariant(employeeStatus.conflictPriority)} className="text-xs">
                    {employeeStatus.conflictPriority >= 4 && 'BLOCCATO - Conflitto critico'}
                    {employeeStatus.conflictPriority === 3 && !employeeStatus?.isPermissionExpired && 
                      `BLOCCATO - Permesso dalle ${employeeStatus.statusDetails?.timeFrom || 'N/A'} alle ${employeeStatus.statusDetails?.timeTo || 'N/A'}`}
                    {employeeStatus.conflictPriority === 2 && 'BLOCCATO - In trasferta'}
                  </Badge>
                </div>
              )}
              
              {/* Messaggio quando il giorno non è lavorativo */}
              {!isWorkingDay() && (
                <div className="text-center">
                  <Badge variant="secondary" className="text-xs">
                    BLOCCATO - Giorno non lavorativo
                  </Badge>
                </div>
              )}

            </div>
          )}

          {/* NUOVO: Tasto seconda entrata - Solo se c'è permesso orario scaduto E non è già stata registrata E c'è stata una prima presenza PRIMA del permesso */}
          {(() => {
            // Controlla se è già stata registrata una seconda entrata per oggi
            const hasSecondCheckin = todayCheckins?.some(checkin => checkin.is_second_checkin) || false;
            
            // Controlla se c'è stata una prima entrata PRIMA dell'inizio del permesso
            const hasMainCheckin = todayAttendance?.check_in_time ? true : false;
            const hasFirstCheckin = todayCheckins?.some(checkin => !checkin.is_second_checkin) || false;
            
            // Controlla se l'entrata principale è stata fatta PRIMA dell'inizio del permesso
            let isMainCheckinBeforePermission = false;
            if (hasMainCheckin && todayAttendance?.check_in_time && employeeStatus?.statusDetails?.timeFrom) {
              const checkinTime = todayAttendance.check_in_time;
              const permissionStartTime = employeeStatus.statusDetails.timeFrom;
              isMainCheckinBeforePermission = checkinTime < permissionStartTime;
            }
            
            // Controlla se ci sono check-in multipli PRIMA dell'inizio del permesso
            let isFirstCheckinBeforePermission = false;
            if (hasFirstCheckin && employeeStatus?.statusDetails?.timeFrom) {
              const permissionStartTime = employeeStatus.statusDetails.timeFrom;
              isFirstCheckinBeforePermission = todayCheckins?.some(checkin => 
                !checkin.is_second_checkin && checkin.checkin_time < permissionStartTime
              ) || false;
            }
            
            // È un permesso "in mezzo alla giornata" solo se c'è stata un'entrata PRIMA del permesso
            const isPermissionInMiddleOfDay = isMainCheckinBeforePermission || isFirstCheckinBeforePermission;
            
            // Logica coerente con il messaggio: mostra il pulsante solo se il messaggio dice che serve seconda entrata
            const shouldShow = employeeStatus?.canSecondCheckIn && 
                              employeeStatus?.hasHourlyPermission && 
                              employeeStatus?.isPermissionExpired && 
                              !hasSecondCheckin &&
                              isPermissionInMiddleOfDay; // Solo se è un permesso in mezzo alla giornata
            console.log('🔍 Debug tasto seconda entrata:', {
              canSecondCheckIn: employeeStatus?.canSecondCheckIn,
              hasHourlyPermission: employeeStatus?.hasHourlyPermission,
              isPermissionExpired: employeeStatus?.isPermissionExpired,
              hasSecondCheckin,
              hasMainCheckin,
              hasFirstCheckin,
              isMainCheckinBeforePermission,
              isFirstCheckinBeforePermission,
              isPermissionInMiddleOfDay,
              checkinTime: todayAttendance?.check_in_time,
              permissionStartTime: employeeStatus?.statusDetails?.timeFrom,
              todayCheckins: todayCheckins?.length || 0,
              todayAttendance: !!todayAttendance,
              shouldShowButton: shouldShow,
              // Debug delle condizioni
              condition1: employeeStatus?.canSecondCheckIn,
              condition2: employeeStatus?.hasHourlyPermission,
              condition3: employeeStatus?.isPermissionExpired,
              condition4: !hasSecondCheckin,
              condition5: isPermissionInMiddleOfDay
            });
            return shouldShow;
          })() && (
            <div className="mt-4">
              <Button 
                onClick={handleSecondCheckIn} 
                disabled={isSecondCheckingIn || statusLoading}
                className="w-full min-h-[44px] text-sm sm:text-base"
                variant="default"
                size="lg"
              >
                {isSecondCheckingIn ? 'Registrando seconda entrata...' : 'Registra Seconda Entrata'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Avvisi di conflitto con priorità - Nascondi se è permesso attivo o presenza già registrata */}
      {employeeStatus && employeeStatus.conflictPriority > 1 && employeeStatus.conflictPriority !== 3 && (
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
                  {employeeStatus.conflictPriority === 3 && !employeeStatus?.isPermissionExpired && 
                    `BLOCCATO - Permesso dalle ${employeeStatus.statusDetails?.timeFrom || 'N/A'} alle ${employeeStatus.statusDetails?.timeTo || 'N/A'}`}
                  {employeeStatus.conflictPriority === 3 && employeeStatus?.isPermissionExpired && 'CONFLITTO RILEVATO'}
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

              {employeeStatus.statusDetails && !(employeeStatus?.hasHourlyPermission && !employeeStatus?.isPermissionExpired) && (
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
              
              {/* Mostra solo il messaggio semplice per permesso attivo */}
              {employeeStatus?.hasHourlyPermission && !employeeStatus?.isPermissionExpired && (
                <div className="mt-3 p-3 rounded-md text-xs bg-yellow-100 text-yellow-800">
                  <div className="text-center">
                    <div className="font-semibold mb-1">Permesso attivo</div>
                    <div className="text-sm">Dettagli mostrati sopra l'orologio</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Status GPS - Nascosto */}
      {/* <GPSStatusIndicator /> */}
    </div>
  );
}
