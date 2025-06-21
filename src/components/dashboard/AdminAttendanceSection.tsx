
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NewManualAttendanceForm from '@/components/attendance/NewManualAttendanceForm';
import NewAttendanceCalendar from '@/components/attendance/NewAttendanceCalendar';
import AdminBusinessTripsManagement from '@/components/admin/AdminBusinessTripsManagement';
import AttendanceExportSection from '@/components/attendance/AttendanceExportSection';

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
          <TabsTrigger value="manual">Inserimento Manuale</TabsTrigger>
          <TabsTrigger value="business-trips">Trasferte</TabsTrigger>
          <TabsTrigger value="export">Esportazioni</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <NewAttendanceCalendar />
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <NewManualAttendanceForm />
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
