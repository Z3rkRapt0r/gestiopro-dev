
import { useAuth } from '@/hooks/useAuth';
import AttendanceCheckInOut from './AttendanceCheckInOut';
import AttendanceHistory from './AttendanceHistory';

export default function AttendancePage() {
  const { profile } = useAuth();

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Presenze Dipendenti</h1>
        <p className="text-muted-foreground">
          {profile?.role === 'admin' 
            ? 'Visualizza e gestisci le presenze di tutti i dipendenti'
            : 'Registra la tua presenza e visualizza lo storico'
          }
        </p>
      </div>

      {profile?.role !== 'admin' && (
        <AttendanceCheckInOut />
      )}

      <AttendanceHistory />
    </div>
  );
}
