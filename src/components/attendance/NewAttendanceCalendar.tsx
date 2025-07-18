
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NewDailyAttendanceCalendar from './NewDailyAttendanceCalendar';
import IntelligentAttendanceCalendar from './IntelligentAttendanceCalendar';
import { Calendar, CalendarPlus } from 'lucide-react';

export default function NewAttendanceCalendar() {
  const queryClient = useQueryClient();

  // Aggiorna i dati quando il componente viene montato
  useEffect(() => {
    console.log('Caricamento calendario presenze generale, invalidando tutte le query...');
    queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
    queryClient.invalidateQueries({ queryKey: ['attendances'] });
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
  }, [queryClient]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-11 sm:h-10">
          <TabsTrigger value="overview" className="flex items-center gap-2 text-xs sm:text-sm">
            <Calendar className="h-4 w-4" />
            Panoramica Generale
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2 text-xs sm:text-sm">
            <CalendarPlus className="h-4 w-4" />
            Inserimento Rapido
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <NewDailyAttendanceCalendar />
        </TabsContent>

        <TabsContent value="manual" className="mt-6">
          <IntelligentAttendanceCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
