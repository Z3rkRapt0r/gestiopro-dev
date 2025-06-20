
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AttendanceCheckInOut from '@/components/attendance/AttendanceCheckInOut';
import AttendanceHistory from '@/components/attendance/AttendanceHistory';

export default function EmployeeAttendanceSection() {
  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Le Mie Presenze</h1>
        <p className="text-muted-foreground">
          Registra la tua presenza e visualizza lo storico
        </p>
      </div>

      <Tabs defaultValue="attendance" className="w-full">
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
