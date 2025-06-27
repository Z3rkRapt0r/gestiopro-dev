
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { useAttendances } from '@/hooks/useAttendances';
import { useAuth } from '@/hooks/useAuth';
import AttendanceHistoryByYear from './AttendanceHistoryByYear';

export default function AttendanceHistory() {
  const { attendances, isLoading, deleteAttendance, isDeleting } = useAttendances();
  const { profile } = useAuth();

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
        <AttendanceHistoryByYear 
          attendances={attendances || []}
          onDeleteAttendance={deleteAttendance}
          isDeleting={isDeleting}
        />
      </CardContent>
    </Card>
  );
}
