
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryClient } from '@tanstack/react-query';
import NewDailyAttendanceCalendar from './NewDailyAttendanceCalendar';
import OperatorCalendarSection from './OperatorCalendarSection';

export default function NewAttendanceCalendar() {
  const [activeTab, setActiveTab] = useState("daily");
  const queryClient = useQueryClient();

  // Aggiorna i dati quando si cambia tab
  useEffect(() => {
    console.log('Cambio tab calendario presenze, invalidando tutte le query...');
    queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
    queryClient.invalidateQueries({ queryKey: ['attendances'] });
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
  }, [activeTab, queryClient]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
