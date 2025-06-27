
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Clock, MapPin, User, ExternalLink, Trash2, CalendarDays, Stethoscope, Plane } from "lucide-react";
import { Attendance } from "@/hooks/useAttendances";
import { useAuth } from "@/hooks/useAuth";

interface AttendanceHistoryByYearProps {
  attendances: Attendance[];
  onDeleteAttendance: (attendanceId: string) => void;
  isDeleting: boolean;
}

export default function AttendanceHistoryByYear({
  attendances,
  onDeleteAttendance,
  isDeleting
}: AttendanceHistoryByYearProps) {
  const { profile } = useAuth();

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    return new Date(timeString).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getEmployeeName = (attendance: Attendance) => {
    if (!attendance.profiles) {
      return 'Dipendente';
    }
    
    if (attendance.profiles.first_name && attendance.profiles.last_name) {
      return `${attendance.profiles.first_name} ${attendance.profiles.last_name}`;
    }
    
    return attendance.profiles.email || 'Dipendente sconosciuto';
  };

  const calculateHours = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return '-';
    
    const startTime = new Date(checkIn);
    const endTime = new Date(checkOut);
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return `${diffHours.toFixed(1)}h`;
  };

  const getStatusBadge = (attendance: Attendance) => {
    if (attendance.is_sick_leave) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
        <Stethoscope className="w-3 h-3 mr-1" />
        Malattia
      </Badge>;
    }
    
    if (attendance.is_business_trip) {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
        <Plane className="w-3 h-3 mr-1" />
        Trasferta
      </Badge>;
    }

    if (!attendance.check_in_time) {
      return <Badge variant="destructive">Assente</Badge>;
    }
    if (!attendance.check_out_time) {
      return <Badge variant="secondary">In servizio</Badge>;
    }
    return <Badge variant="default" className="bg-green-600">Completato</Badge>;
  };

  const getTypeBadge = (attendance: Attendance) => {
    if (attendance.is_manual) {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
        Manuale
      </Badge>;
    }
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
      Automatica
    </Badge>;
  };

  const getGoogleMapsLink = (latitude: number, longitude: number) => {
    return `https://maps.google.com/?q=${latitude},${longitude}`;
  };

  const renderLocationCell = (attendance: Attendance) => {
    if (profile?.role !== 'admin' || attendance.is_manual) {
      if (attendance.is_manual) {
        return <span className="text-sm text-muted-foreground">Manuale</span>;
      }
      // Per dipendenti normali, mostra solo l'icona GPS
      if (attendance.check_in_latitude && attendance.check_in_longitude) {
        return (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-3 h-3" />
            GPS
          </div>
        );
      }
      return <span className="text-sm text-muted-foreground">-</span>;
    }

    // Per admin, mostra i link alle mappe
    const hasCheckInLocation = attendance.check_in_latitude && attendance.check_in_longitude;
    const hasCheckOutLocation = attendance.check_out_latitude && attendance.check_out_longitude;

    if (!hasCheckInLocation && !hasCheckOutLocation) {
      return <span className="text-sm text-muted-foreground">-</span>;
    }

    return (
      <div className="space-y-1">
        {hasCheckInLocation && (
          <div>
            <a
              href={getGoogleMapsLink(attendance.check_in_latitude!, attendance.check_in_longitude!)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 hover:underline"
            >
              <MapPin className="w-3 h-3" />
              Check-in
              <ExternalLink className="w-2 h-2" />
            </a>
          </div>
        )}
        {hasCheckOutLocation && (
          <div>
            <a
              href={getGoogleMapsLink(attendance.check_out_latitude!, attendance.check_out_longitude!)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 hover:underline"
            >
              <MapPin className="w-3 h-3" />
              Check-out
              <ExternalLink className="w-2 h-2" />
            </a>
          </div>
        )}
      </div>
    );
  };

  // Raggruppa le presenze per anno
  const attendancesByYear = attendances.reduce((acc, att) => {
    const year = new Date(att.date).getFullYear();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(att);
    return acc;
  }, {} as Record<number, Attendance[]>);

  // Raggruppa le presenze per mese
  const groupAttendancesByMonth = (yearAttendances: Attendance[]) => {
    return yearAttendances.reduce((acc, att) => {
      const month = new Date(att.date).getMonth() + 1;
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(att);
      return acc;
    }, {} as Record<number, Attendance[]>);
  };

  // Ordina gli anni dal più recente al più vecchio
  const sortedYears = Object.keys(attendancesByYear).map(Number).sort((a, b) => b - a);

  // Funzione per convertire numero mese in nome italiano
  const getMonthName = (monthNumber: number): string => {
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    return months[monthNumber - 1] || 'Mese sconosciuto';
  };

  if (attendances.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nessuna presenza registrata.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedYears.map(year => {
        const yearAttendances = attendancesByYear[year];
        return (
          <Card key={year} className="mb-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value={`year-${year}`} className="border-none">
                <AccordionTrigger className="hover:no-underline px-6 py-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center">
                      <CalendarDays className="w-4 h-4 text-blue-600" />
                    </div>
                    Anno {year}
                    <Badge variant="secondary" className="ml-2">
                      {yearAttendances.length} presenze
                    </Badge>
                    {year === new Date().getFullYear() && (
                      <Badge variant="default" className="ml-2 bg-green-600">
                        Anno corrente
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-3">
                    {(() => {
                      const attendancesByMonth = groupAttendancesByMonth(yearAttendances);
                      const sortedMonths = Object.keys(attendancesByMonth).map(Number).sort((a, b) => b - a);
                      
                      return sortedMonths.map(month => {
                        const monthAttendances = attendancesByMonth[month];
                        const monthName = getMonthName(month);
                        
                        return (
                          <div key={month} className="border rounded-md bg-gray-50">
                            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-t-md">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Calendar className="w-4 h-4 text-purple-600" />
                                {monthName}
                                <Badge variant="outline" className="ml-2">
                                  {monthAttendances.length} presenze
                                </Badge>
                              </div>
                            </div>
                            <div className="p-3 space-y-2">
                              {monthAttendances
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(attendance => (
                                <div key={attendance.id} className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <div className="text-sm font-medium">
                                          {formatDate(attendance.date)}
                                        </div>
                                        {profile?.role === 'admin' && (
                                          <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">
                                              {getEmployeeName(attendance)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-green-600" />
                                          {formatTime(attendance.check_in_time)}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-red-600" />
                                          {formatTime(attendance.check_out_time)}
                                        </div>
                                        <div>
                                          Ore: {calculateHours(attendance.check_in_time, attendance.check_out_time)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {attendance.notes && (
                                      <div className="text-xs text-muted-foreground max-w-48 truncate" title={attendance.notes}>
                                        "{attendance.notes}"
                                      </div>
                                    )}
                                    {getTypeBadge(attendance)}
                                    {getStatusBadge(attendance)}
                                    <div className="text-xs text-muted-foreground">
                                      {renderLocationCell(attendance)}
                                    </div>
                                    
                                    {profile?.role === 'admin' && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="destructive" size="sm" disabled={isDeleting}>
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Annulla Presenza</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Sei sicuro di voler annullare questa presenza? Questa azione non può essere annullata.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => onDeleteAttendance(attendance.id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Elimina
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        );
      })}
    </div>
  );
}
