
import { useAuth } from '@/hooks/useAuth';
import AttendanceCheckInOut from './AttendanceCheckInOut';
import AttendanceHistory from './AttendanceHistory';

export default function AttendancePage() {
  const { profile } = useAuth();

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-8 space-y-6 px-4 sm:px-6">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Presenze Dipendenti</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          {profile?.role === 'admin' 
            ? 'Visualizza e gestisci le presenze di tutti i dipendenti'
            : 'Registra la tua presenza e visualizza lo storico'
          }
        </p>
      </div>

      {profile?.role !== 'admin' && (
        <div className="flex justify-center">
          <AttendanceCheckInOut />
        </div>
      )}

      <AttendanceHistory />
    </div>
  );
}
