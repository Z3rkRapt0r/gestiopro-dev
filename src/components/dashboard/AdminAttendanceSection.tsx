
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
    <div className="w-full max-w-none px-3 sm:px-4 lg:px-8 xl:px-12 py-4 sm:py-6 lg:py-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 lg:mb-3">
          Gestione Presenze
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
          Monitora e gestisci le presenze dei dipendenti
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Desktop-optimized tabs with responsive grid */}
        <div className="w-full mb-6 lg:mb-8">
          <TabsList className="w-full h-auto bg-muted/40 p-2 lg:p-3 rounded-xl shadow-sm border border-muted/60">
            {/* Mobile: horizontal scroll */}
            <div className="flex lg:hidden w-full overflow-x-auto scrollbar-hide">
              <div className="flex space-x-1 min-w-max px-1">
                <TabsTrigger 
                  value="calendar" 
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                >
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>Cal. Generale</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="operator" 
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                >
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span>Cal. Operatore</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="manual" 
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                >
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  <span>Inserimento</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="business-trips" 
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                >
                  <Briefcase className="h-4 w-4 flex-shrink-0" />
                  <span>Trasferte</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="attendance-archive" 
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                >
                  <Archive className="h-4 w-4 flex-shrink-0" />
                  <span>Arch. Presenze</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="sick-archive" 
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span>Arch. Malattie</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="export" 
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                >
                  <Download className="h-4 w-4 flex-shrink-0" />
                  <span>Export</span>
                </TabsTrigger>
              </div>
            </div>

            {/* Desktop: 2x4 grid layout */}
            <div className="hidden lg:grid lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-7 gap-2 lg:gap-3 w-full">
              <TabsTrigger 
                value="calendar" 
                className="flex items-center justify-center gap-2 lg:gap-3 px-4 lg:px-6 py-3 lg:py-4 text-sm lg:text-base font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-xl transition-all duration-300 hover:bg-background/50 hover:shadow-md group"
              >
                <Calendar className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0 group-data-[state=active]:text-primary" />
                <span className="hidden xl:inline">Calendario Generale</span>
                <span className="xl:hidden">Cal. Generale</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="operator" 
                className="flex items-center justify-center gap-2 lg:gap-3 px-4 lg:px-6 py-3 lg:py-4 text-sm lg:text-base font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-xl transition-all duration-300 hover:bg-background/50 hover:shadow-md group"
              >
                <User className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0 group-data-[state=active]:text-primary" />
                <span className="hidden xl:inline">Calendario Operatore</span>
                <span className="xl:hidden">Cal. Operatore</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="manual" 
                className="flex items-center justify-center gap-2 lg:gap-3 px-4 lg:px-6 py-3 lg:py-4 text-sm lg:text-base font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-xl transition-all duration-300 hover:bg-background/50 hover:shadow-md group"
              >
                <Plus className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0 group-data-[state=active]:text-primary" />
                <span className="hidden xl:inline">Inserimento Presenza</span>
                <span className="xl:hidden">Inserimento</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="business-trips" 
                className="flex items-center justify-center gap-2 lg:gap-3 px-4 lg:px-6 py-3 lg:py-4 text-sm lg:text-base font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-xl transition-all duration-300 hover:bg-background/50 hover:shadow-md group"
              >
                <Briefcase className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0 group-data-[state=active]:text-primary" />
                <span>Trasferte</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="attendance-archive" 
                className="flex items-center justify-center gap-2 lg:gap-3 px-4 lg:px-6 py-3 lg:py-4 text-sm lg:text-base font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-xl transition-all duration-300 hover:bg-background/50 hover:shadow-md group"
              >
                <Archive className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0 group-data-[state=active]:text-primary" />
                <span className="hidden xl:inline">Archivio Presenze</span>
                <span className="xl:hidden">Arch. Presenze</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="sick-archive" 
                className="flex items-center justify-center gap-2 lg:gap-3 px-4 lg:px-6 py-3 lg:py-4 text-sm lg:text-base font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-xl transition-all duration-300 hover:bg-background/50 hover:shadow-md group"
              >
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0 group-data-[state=active]:text-primary" />
                <span className="hidden xl:inline">Archivio Malattie</span>
                <span className="xl:hidden">Arch. Malattie</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="export" 
                className="flex items-center justify-center gap-2 lg:gap-3 px-4 lg:px-6 py-3 lg:py-4 text-sm lg:text-base font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-xl transition-all duration-300 hover:bg-background/50 hover:shadow-md group"
              >
                <Download className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0 group-data-[state=active]:text-primary" />
                <span>Esportazioni</span>
              </TabsTrigger>
            </div>
          </TabsList>
        </div>

        {/* Content with better desktop spacing */}
        <div className="w-full">
          <TabsContent value="calendar" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-gradient-to-br from-background to-muted/20 rounded-xl lg:rounded-2xl p-4 lg:p-6 xl:p-8 shadow-sm border border-muted/40">
              <NewAttendanceCalendar />
            </div>
          </TabsContent>

          <TabsContent value="operator" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-gradient-to-br from-background to-muted/20 rounded-xl lg:rounded-2xl p-4 lg:p-6 xl:p-8 shadow-sm border border-muted/40">
              <OperatorCalendarSection />
            </div>
          </TabsContent>

          <TabsContent value="manual" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-gradient-to-br from-background to-muted/20 rounded-xl lg:rounded-2xl p-4 lg:p-6 xl:p-8 shadow-sm border border-muted/40">
              <ManualAttendanceSection />
            </div>
          </TabsContent>

          <TabsContent value="business-trips" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-gradient-to-br from-background to-muted/20 rounded-xl lg:rounded-2xl p-4 lg:p-6 xl:p-8 shadow-sm border border-muted/40">
              <AdminBusinessTripsManagement />
            </div>
          </TabsContent>

          <TabsContent value="attendance-archive" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-gradient-to-br from-background to-muted/20 rounded-xl lg:rounded-2xl p-4 lg:p-6 xl:p-8 shadow-sm border border-muted/40">
              <AttendanceArchiveSection />
            </div>
          </TabsContent>

          <TabsContent value="sick-archive" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-gradient-to-br from-background to-muted/20 rounded-xl lg:rounded-2xl p-4 lg:p-6 xl:p-8 shadow-sm border border-muted/40">
              <SickLeaveArchiveSection />
            </div>
          </TabsContent>

          <TabsContent value="export" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-gradient-to-br from-background to-muted/20 rounded-xl lg:rounded-2xl p-4 lg:p-6 xl:p-8 shadow-sm border border-muted/40">
              <AttendanceExportSection />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
