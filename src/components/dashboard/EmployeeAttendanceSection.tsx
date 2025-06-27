
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryClient } from '@tanstack/react-query';
import { useAttendanceHistoryVisibility } from '@/hooks/useAttendanceHistoryVisibility';
import AttendanceCheckInOut from '@/components/attendance/AttendanceCheckInOut';
import AttendanceHistory from '@/components/attendance/AttendanceHistory';

export default function EmployeeAttendanceSection() {
  const [activeTab, setActiveTab] = useState("attendance");
  const queryClient = useQueryClient();
  const { isHistoryVisible, isLoading } = useAttendanceHistoryVisibility();

  // Aggiorna i dati quando si cambia tab
  useEffect(() => {
    console.log('Cambio tab presenze dipendente, invalidando tutte le query...');
    queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
    queryClient.invalidateQueries({ queryKey: ['attendances'] });
  }, [activeTab, queryClient]);

  // Se lo storico non è visibile, forza il tab su "attendance"
  useEffect(() => {
    if (!isHistoryVisible && activeTab === "history") {
      setActiveTab("attendance");
    }
  }, [isHistoryVisible, activeTab]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-8 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-slate-200 rounded"></div>
          <div className="h-4 w-96 bg-slate-200 rounded"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Le Mie Presenze</h1>
        <p className="text-muted-foreground">
          Registra la tua presenza{isHistoryVisible && ' e visualizza lo storico'}
        </p>
      </div>

      {isHistoryVisible ? (
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
      ) : (
        <div className="space-y-6">
          <AttendanceCheckInOut />
        </div>
      )}
    </div>
  );
}
