
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DailyAttendanceCalendar from './DailyAttendanceCalendar';
import OperatorAttendanceSection from './OperatorAttendanceSection';

export default function AttendanceCalendar() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily">Calendario Generale</TabsTrigger>
          <TabsTrigger value="operator">Calendario per Operatore</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-6">
          <DailyAttendanceCalendar />
        </TabsContent>

        <TabsContent value="operator" className="mt-6">
          <OperatorAttendanceSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
