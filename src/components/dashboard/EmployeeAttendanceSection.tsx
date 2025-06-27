
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryClient } from '@tanstack/react-query';
import AttendanceCheckInOut from '@/components/attendance/AttendanceCheckInOut';
import AttendanceHistory from '@/components/attendance/AttendanceHistory';
import { useAttendanceHistoryVisibility } from '@/hooks/useAttendanceHistoryVisibility';
import { Skeleton } from '@/components/ui/skeleton';

export default function EmployeeAttendanceSection() {
  const [activeTab, setActiveTab] = useState("attendance");
  const queryClient = useQueryClient();
  const { isHistoryVisible, loading } = useAttendanceHistoryVisibility();

  // Aggiorna i dati quando si cambia tab
  useEffect(() => {
    console.log('Cambio tab presenze dipendente, invalidando tutte le query...');
    queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
    queryClient.invalidateQueries({ queryKey: ['attendances'] });
  }, [activeTab, queryClient]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Se lo storico non è visibile, mostra solo il check-in/out senza tab
  if (!isHistoryVisible) {
    return (
      <div className="max-w-6xl mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Le Mie Presenze</h1>
          <p className="text-muted-foreground">
            Registra la tua presenza
          </p>
        </div>
        <AttendanceCheckInOut />
      </div>
    );
  }

  // Se lo storico è visibile, mostra la struttura completa con tab
  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Le Mie Presenze</h1>
        <p className="text-muted-foreground">
          Registra la tua presenza e visualizza lo storico
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="attendance">Presenza</TabsTrigger>
          <TabsTrigger value="history">Storico</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-6">
          <AttendanceCheckInOut />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <AttendanceHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
