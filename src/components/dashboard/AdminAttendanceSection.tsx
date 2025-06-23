
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NewAttendanceCalendar from '@/components/attendance/NewAttendanceCalendar';
import AdminBusinessTripsManagement from '@/components/admin/AdminBusinessTripsManagement';
import AttendanceExportSection from '@/components/attendance/AttendanceExportSection';
import ManualAttendanceSection from '@/components/attendance/ManualAttendanceSection';
import OperatorCalendarSection from '@/components/attendance/OperatorCalendarSection';

export default function AdminAttendanceSection() {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gestione Presenze</h1>
        <p className="text-muted-foreground">
          Monitora e gestisci le presenze dei dipendenti
        </p>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
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
