
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
    <div className="w-full max-w-none px-2 sm:px-3 lg:px-4 py-2 sm:py-3 lg:py-4">
      <div className="mb-3 lg:mb-4">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 lg:mb-2">
          Gestione Presenze
        </h1>
        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
          Monitora e gestisci le presenze dei dipendenti
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Compact tabs with single row layout */}
        <div className="w-full mb-3 lg:mb-4">
          <TabsList className="w-full h-auto bg-muted/40 p-1 lg:p-2 rounded-lg shadow-sm border border-muted/60">
            {/* Mobile: horizontal scroll */}
            <div className="flex lg:hidden w-full overflow-x-auto scrollbar-hide">
              <div className="flex space-x-1 min-w-max px-1">
                <TabsTrigger 
                  value="calendar" 
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm rounded transition-all duration-200"
                >
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span>Cal. Generale</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="operator" 
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm rounded transition-all duration-200"
                >
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span>Cal. Operatore</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="manual" 
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm rounded transition-all duration-200"
                >
                  <Plus className="h-3 w-3 flex-shrink-0" />
                  <span>Inserimento</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="business-trips" 
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm rounded transition-all duration-200"
                >
                  <Briefcase className="h-3 w-3 flex-shrink-0" />
                  <span>Trasferte</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="attendance-archive" 
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm rounded transition-all duration-200"
                >
                  <Archive className="h-3 w-3 flex-shrink-0" />
                  <span>Arch. Presenze</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="sick-archive" 
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm rounded transition-all duration-200"
                >
                  <FileText className="h-3 w-3 flex-shrink-0" />
                  <span>Arch. Malattie</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="export" 
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm rounded transition-all duration-200"
                >
                  <Download className="h-3 w-3 flex-shrink-0" />
                  <span>Export</span>
                </TabsTrigger>
              </div>
            </div>

            {/* Desktop: single row layout with all tabs */}
            <div className="hidden lg:flex w-full gap-1 overflow-x-auto">
              <TabsTrigger 
                value="calendar" 
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs lg:text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:scale-105 rounded-lg transition-all duration-200 hover:bg-background/50 hover:shadow-sm group flex-1 min-w-0"
              >
                <Calendar className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0 group-data-[state=active]:text-primary" />
                <span className="truncate">Calendario Generale</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="operator" 
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs lg:text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:scale-105 rounded-lg transition-all duration-200 hover:bg-background/50 hover:shadow-sm group flex-1 min-w-0"
              >
                <User className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0 group-data-[state=active]:text-primary" />
                <span className="truncate">Calendario Operatore</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="manual" 
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs lg:text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:scale-105 rounded-lg transition-all duration-200 hover:bg-background/50 hover:shadow-sm group flex-1 min-w-0"
              >
                <Plus className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0 group-data-[state=active]:text-primary" />
                <span className="truncate">Inserimento Presenza</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="business-trips" 
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs lg:text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:scale-105 rounded-lg transition-all duration-200 hover:bg-background/50 hover:shadow-sm group flex-1 min-w-0"
              >
                <Briefcase className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0 group-data-[state=active]:text-primary" />
                <span className="truncate">Trasferte</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="attendance-archive" 
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs lg:text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:scale-105 rounded-lg transition-all duration-200 hover:bg-background/50 hover:shadow-sm group flex-1 min-w-0"
              >
                <Archive className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0 group-data-[state=active]:text-primary" />
                <span className="truncate">Archivio Presenze</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="sick-archive" 
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs lg:text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:scale-105 rounded-lg transition-all duration-200 hover:bg-background/50 hover:shadow-sm group flex-1 min-w-0"
              >
                <FileText className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0 group-data-[state=active]:text-primary" />
                <span className="truncate">Archivio Malattie</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="export" 
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs lg:text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:scale-105 rounded-lg transition-all duration-200 hover:bg-background/50 hover:shadow-sm group flex-1 min-w-0"
              >
                <Download className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0 group-data-[state=active]:text-primary" />
                <span className="truncate">Esportazioni</span>
              </TabsTrigger>
            </div>
          </TabsList>
        </div>

        {/* Compact content with reduced spacing */}
        <div className="w-full">
          <TabsContent value="calendar" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-gradient-to-br from-background to-muted/20 rounded-lg p-3 lg:p-4 shadow-sm border border-muted/40">
              <NewAttendanceCalendar />
            </div>
          </TabsContent>

          <TabsContent value="operator" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-gradient-to-br from-background to-muted/20 rounded-lg p-3 lg:p-4 shadow-sm border border-muted/40">
              <OperatorCalendarSection />
            </div>
          </TabsContent>

          <TabsContent value="manual" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-gradient-to-br from-background to-muted/20 rounded-lg p-3 lg:p-4 shadow-sm border border-muted/40">
              <ManualAttendanceSection />
            </div>
          </TabsContent>

          <TabsContent value="business-trips" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-gradient-to-br from-background to-muted/20 rounded-lg p-3 lg:p-4 shadow-sm border border-muted/40">
              <AdminBusinessTripsManagement />
            </div>
          </TabsContent>

          <TabsContent value="attendance-archive" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-gradient-to-br from-background to-muted/20 rounded-lg p-3 lg:p-4 shadow-sm border border-muted/40">
              <AttendanceArchiveSection />
            </div>
          </TabsContent>

          <TabsContent value="sick-archive" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-gradient-to-br from-background to-muted/20 rounded-lg p-3 lg:p-4 shadow-sm border border-muted/40">
              <SickLeaveArchiveSection />
            </div>
          </TabsContent>

          <TabsContent value="export" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="bg-gradient-to-br from-background to-muted/20 rounded-lg p-3 lg:p-4 shadow-sm border border-muted/40">
              <AttendanceExportSection />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
