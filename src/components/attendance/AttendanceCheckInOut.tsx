
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAttendanceOperations } from '@/hooks/useAttendanceOperations';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import GPSStatusIndicator from './GPSStatusIndicator';

export default function AttendanceCheckInOut() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { 
    todayAttendance, 
    checkIn, 
    checkOut, 
    isCheckingIn, 
    isCheckingOut,
    hasActiveSession 
  } = useAttendanceOperations();
  const { workSchedule } = useWorkSchedules();

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
                  {todayAttendance.check_in_time ? 
                    format(new Date(todayAttendance.check_in_time), 'HH:mm') : 
                    '--:--'
                  }
                </span>
              </div>

              {todayAttendance.check_out_time ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Uscita</span>
                  </div>
                  <span className="text-blue-700 font-bold">
                    {format(new Date(todayAttendance.check_out_time), 'HH:mm')}
                  </span>
                </div>
              ) : (
                <Button 
                  onClick={checkOut} 
                  disabled={isCheckingOut} 
                  className="w-full"
                  variant="outline"
                >
                  {isCheckingOut ? 'Registrando uscita...' : 'Registra Uscita'}
                </Button>
              )}
            </div>
          ) : (
            <Button 
              onClick={checkIn} 
              disabled={isCheckingIn} 
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
