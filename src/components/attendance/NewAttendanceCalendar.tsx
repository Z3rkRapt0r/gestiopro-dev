
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NewDailyAttendanceCalendar from './NewDailyAttendanceCalendar';
import OperatorCalendarSection from './OperatorCalendarSection';

export default function NewAttendanceCalendar() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily">Calendario Generale</TabsTrigger>
          <TabsTrigger value="operator">Calendario per Operatore</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-6">
          <NewDailyAttendanceCalendar />
        </TabsContent>

        <TabsContent value="operator" className="mt-6">
          <OperatorCalendarSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
