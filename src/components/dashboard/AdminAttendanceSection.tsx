
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryClient } from '@tanstack/react-query';
import NewAttendanceCalendar from '@/components/attendance/NewAttendanceCalendar';
import AdminBusinessTripsManagement from '@/components/admin/AdminBusinessTripsManagement';
import AttendanceExportSection from '@/components/attendance/AttendanceExportSection';
import ManualAttendanceSection from '@/components/attendance/ManualAttendanceSection';
import OperatorCalendarSection from '@/components/attendance/OperatorCalendarSection';

export default function AdminAttendanceSection() {
  const [activeTab, setActiveTab] = useState("calendar");
  const queryClient = useQueryClient();

  // Aggiorna i dati quando si cambia tab
  useEffect(() => {
    console.log('Cambio tab presenze, invalidando tutte le query...');
    // Invalida tutte le query principali per aggiornare i dati in tempo reale
    queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
    queryClient.invalidateQueries({ queryKey: ['attendances'] });
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
    queryClient.invalidateQueries({ queryKey: ['business-trips'] });
    queryClient.invalidateQueries({ queryKey: ['manual-attendances'] });
  }, [activeTab, queryClient]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gestione Presenze</h1>
        <p className="text-muted-foreground">
          Monitora e gestisci le presenze dei dipendenti
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="calendar">Calendario Generale</TabsTrigger>
          <TabsTrigger value="operator">Calendario Operatore</TabsTrigger>
          <TabsTrigger value="manual">Inserimento Manuale</TabsTrigger>
          <TabsTrigger value="business-trips">Trasferte</TabsTrigger>
          <TabsTrigger value="export">Esportazioni</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <NewAttendanceCalendar />
        </TabsContent>

        <TabsContent value="operator" className="space-y-6">
          <OperatorCalendarSection />
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <ManualAttendanceSection />
        </TabsContent>

        <TabsContent value="business-trips" className="space-y-6">
          <AdminBusinessTripsManagement />
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <AttendanceExportSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
