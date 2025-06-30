
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryClient } from '@tanstack/react-query';
import NewAttendanceCalendar from '@/components/attendance/NewAttendanceCalendar';
import AdminBusinessTripsManagement from '@/components/admin/AdminBusinessTripsManagement';
import AttendanceExportSection from '@/components/attendance/AttendanceExportSection';
import ManualAttendanceSection from '@/components/attendance/ManualAttendanceSection';
import OperatorCalendarSection from '@/components/attendance/OperatorCalendarSection';
import AttendanceArchiveSection from '@/components/attendance/AttendanceArchiveSection';
import SickLeaveArchiveSection from '@/components/attendance/SickLeaveArchiveSection';
import { Calendar, User, Plus, Briefcase, Archive, FileText, Download } from 'lucide-react';

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
    <div className="w-full max-w-none px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Gestione Presenze</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Monitora e gestisci le presenze dei dipendenti
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Mobile-optimized tabs with horizontal scroll */}
        <div className="w-full overflow-x-auto">
          <TabsList className="mb-4 min-w-full flex lg:grid lg:grid-cols-7 h-auto lg:h-11 bg-muted/30 p-1">
            <TabsTrigger 
              value="calendar" 
              className="flex-shrink-0 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-0"
            >
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Calendario Generale</span>
              <span className="sm:hidden">Cal. Gen.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="operator" 
              className="flex-shrink-0 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-0"
            >
              <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Calendario Operatore</span>
              <span className="sm:hidden">Cal. Op.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="manual" 
              className="flex-shrink-0 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-0"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Inserimento Presenza/Malattia</span>
              <span className="md:hidden">Inserimento</span>
            </TabsTrigger>
            <TabsTrigger 
              value="business-trips" 
              className="flex-shrink-0 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-0"
            >
              <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Trasferte</span>
              <span className="sm:hidden">Trasf.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="attendance-archive" 
              className="flex-shrink-0 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-0"
            >
              <Archive className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Archivio Presenze</span>
              <span className="sm:hidden">Arch. Pres.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sick-archive" 
              className="flex-shrink-0 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-0"
            >
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Archivio Malattia</span>
              <span className="sm:hidden">Arch. Mal.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="export" 
              className="flex-shrink-0 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-0"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Esportazioni</span>
              <span className="sm:hidden">Export</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="calendar" className="mt-4 sm:mt-6 focus-visible:outline-none focus-visible:ring-0">
          <NewAttendanceCalendar />
        </TabsContent>

        <TabsContent value="operator" className="mt-4 sm:mt-6 focus-visible:outline-none focus-visible:ring-0">
          <OperatorCalendarSection />
        </TabsContent>

        <TabsContent value="manual" className="mt-4 sm:mt-6 focus-visible:outline-none focus-visible:ring-0">
          <ManualAttendanceSection />
        </TabsContent>

        <TabsContent value="business-trips" className="mt-4 sm:mt-6 focus-visible:outline-none focus-visible:ring-0">
          <AdminBusinessTripsManagement />
        </TabsContent>

        <TabsContent value="attendance-archive" className="mt-4 sm:mt-6 focus-visible:outline-none focus-visible:ring-0">
          <AttendanceArchiveSection />
        </TabsContent>

        <TabsContent value="sick-archive" className="mt-4 sm:mt-6 focus-visible:outline-none focus-visible:ring-0">
          <SickLeaveArchiveSection />
        </TabsContent>

        <TabsContent value="export" className="mt-4 sm:mt-6 focus-visible:outline-none focus-visible:ring-0">
          <AttendanceExportSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
