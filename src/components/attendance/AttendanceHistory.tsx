
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Clock, MapPin, User, ExternalLink } from 'lucide-react';
import { useAttendances, Attendance } from '@/hooks/useAttendances';
import { useAuth } from '@/hooks/useAuth';

export default function AttendanceHistory() {
  const { attendances, isLoading } = useAttendances();
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
    if (!attendance.check_in_time) {
      return <Badge variant="destructive">Assente</Badge>;
    }
    if (!attendance.check_out_time) {
      return <Badge variant="secondary">In servizio</Badge>;
    }
    return <Badge variant="default" className="bg-green-600">Completato</Badge>;
  };

  const getGoogleMapsLink = (latitude: number, longitude: number) => {
    return `https://maps.google.com/?q=${latitude},${longitude}`;
  };

  const renderLocationCell = (attendance: Attendance) => {
    if (profile?.role !== 'admin') {
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Storico Presenze
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Caricamento...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Storico Presenze
          {profile?.role === 'admin' && (
            <Badge variant="outline" className="ml-2">Vista Admin</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!attendances || attendances.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessuna presenza registrata.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  {profile?.role === 'admin' && <TableHead>Dipendente</TableHead>}
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Ore Lavorate</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Posizione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendances.map((attendance) => (
                  <TableRow key={attendance.id}>
                    <TableCell className="font-medium">
                      {formatDate(attendance.date)}
                    </TableCell>
                    {profile?.role === 'admin' && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {getEmployeeName(attendance)}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        {formatTime(attendance.check_in_time)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-red-600" />
                        {formatTime(attendance.check_out_time)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {calculateHours(attendance.check_in_time, attendance.check_out_time)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(attendance)}
                    </TableCell>
                    <TableCell>
                      {renderLocationCell(attendance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
