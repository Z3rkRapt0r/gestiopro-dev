
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DailyAttendanceCalendar from './DailyAttendanceCalendar';
import OperatorAttendanceSection from './OperatorAttendanceSection';

export default function AttendanceCalendar() {
  return (
    <div className="space-y-6 px-4 sm:px-6">
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-11 sm:h-10">
          <TabsTrigger value="daily" className="text-xs sm:text-sm">Calendario Generale</TabsTrigger>
          <TabsTrigger value="operator" className="text-xs sm:text-sm">Calendario per Operatore</TabsTrigger>
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
